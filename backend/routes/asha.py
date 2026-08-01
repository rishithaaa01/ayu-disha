import os
import json
import shutil
import tempfile
import time
import uuid
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request, status, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import List, Dict, Any
from datetime import datetime, timedelta
from database import get_database
from middleware.auth_middleware import get_current_user
from models.user import UserResponse
from models.asha import (
    HouseholdCreate, VisitCreate, RiskClassifyRequest, 
    RiskClassifyResponse, ReferralCreate
)
from services.transcription_service import transcription_service
from bson import ObjectId
from groq import AsyncGroq
from config import settings
from services.ai_routing import assign_referral_to_specialist

rate_limit_store = defaultdict(list)

def check_rate_limit(key: str, limit: int, window: int) -> bool:
    now = time.time()
    rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < window]
    if len(rate_limit_store[key]) >= limit:
        return False
    rate_limit_store[key].append(now)
    return True

def safe_object_id(id_str: str):
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid ID format: {id_str}. Must be a 24-character hex string."
        )

router = APIRouter()

@router.get("/households")
async def get_households(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    
    households_cursor = db.households.find({"created_by": current_user.id})
    households = await households_cursor.to_list(100)
    
    def get_risk_weight(h):
        risk = h.get("risk_level", "green").lower()
        if risk == "red": return 0
        if risk == "amber": return 1
        return 2
        
    households.sort(key=get_risk_weight)
    
    for h in households:
        h_id_str = str(h.pop("_id"))
        h["id"] = h_id_str
        
        # Calculate total visit count across all recorded visits
        if "visits" in h and isinstance(h["visits"], list) and len(h["visits"]) > 0:
            h["total_visits"] = len(h["visits"])
        else:
            try:
                hh_obj_id = safe_object_id(h_id_str)
                count = await db.asha_visits.count_documents({
                    "$or": [
                        {"household_id": h_id_str},
                        {"household_id": str(hh_obj_id)}
                    ],
                    "asha_id": current_user.id
                })
            except Exception:
                count = await db.asha_visits.count_documents({"household_id": h_id_str, "asha_id": current_user.id})
            h["total_visits"] = count
    
    return households

@router.post("/households")
async def register_household(household: HouseholdCreate, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    household_dict = household.dict()
    household_dict["created_by"] = current_user.id
    household_dict["created_at"] = datetime.utcnow()
    household_dict["risk_level"] = "green"
    household_dict["open_issues"] = []
    
    res = await db.households.insert_one(household_dict)
    household_dict["id"] = str(res.inserted_id)
    if "_id" in household_dict: household_dict.pop("_id")
    return household_dict

@router.get("/households/{household_id}")
async def get_household(household_id: str, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    h = await db.households.find_one({"_id": safe_object_id(household_id)})
    if not h:
        raise HTTPException(status_code=404, detail="Household not found")
        
    if h.get("created_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this household")
        
    h["id"] = str(h.pop("_id"))
    
    try:
        hh_obj_id = safe_object_id(household_id)
        visits_cursor = db.asha_visits.find({
            "$or": [
                {"household_id": household_id},
                {"household_id": str(hh_obj_id)}
            ],
            "asha_id": current_user.id
        }).sort("created_at", -1)
    except Exception:
        visits_cursor = db.asha_visits.find({"household_id": household_id, "asha_id": current_user.id}).sort("created_at", -1)

    visits = await visits_cursor.to_list(length=50)
    for v in visits:
        v["id"] = str(v.pop("_id"))
        if "_id" in v: v.pop("_id")
        
    h["visit_history"] = visits
    h["total_visits"] = len(visits)
    return h

@router.post("/visits")
async def submit_visit(visit: VisitCreate, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    
    # DEBUG LOGGING
    print(f"[VISIT DEBUG] Received visit submission from ASHA {current_user.id}")
    print(f"[VISIT DEBUG] household_id: {visit.household_id} (type: {type(visit.household_id)})")
    print(f"[VISIT DEBUG] member_id: {visit.member_id} (type: {type(visit.member_id)})")
    print(f"[VISIT DEBUG] observations: {visit.observations} (type: {type(visit.observations)})")
    print(f"[VISIT DEBUG] risk_level: {visit.risk_level}")
    
    # Verify household exists and belongs to this ASHA worker
    try:
        hh = await db.households.find_one({"_id": safe_object_id(visit.household_id)})
    except HTTPException as e:
        print(f"[VISIT DEBUG] Invalid household_id format: {visit.household_id}")
        raise HTTPException(status_code=400, detail=f"Invalid household_id format: {visit.household_id}")
    
    if not hh:
        print(f"[VISIT DEBUG] Household not found: {visit.household_id}")
        raise HTTPException(status_code=404, detail="Household not found")
    if hh.get("created_by") != current_user.id:
        print(f"[VISIT DEBUG] Access denied: household belongs to {hh.get('created_by')}, not {current_user.id}")
        raise HTTPException(status_code=403, detail="Access denied to this household")

    # Normalise risk_level — accept URGENT/urgent/red, WATCH/watch/amber, LOW/low/green
    risk_raw = (visit.risk_level or "WATCH").upper()
    if risk_raw in ["RED", "URGENT"]:
        risk = "red"
    elif risk_raw in ["AMBER", "WATCH"]:
        risk = "amber"
    else:
        risk = "green"

    visit_dict = visit.dict()
    visit_dict["asha_id"] = current_user.id
    visit_dict["risk_level"] = risk
    visit_dict["created_at"] = datetime.utcnow()
    
    res = await db.asha_visits.insert_one(visit_dict)
    visit_id = str(res.inserted_id)
    visit_dict["id"] = visit_id
    
    urgent = risk == "red"
    
    await db.households.update_one(
        {"_id": safe_object_id(visit.household_id)},
        {
            "$set": {
                "last_visit_date": datetime.utcnow(),
                "risk_level": risk
            },
            "$inc": {"visit_count": 1},
            "$push": {
                "visits": {
                    "id": visit_id,
                    "member_id": visit.member_id,
                    "visit_type": visit.visit_type,
                    "risk_level": risk,
                    "observations": visit.observations,
                    "ai_reasoning": visit.ai_reasoning,
                    "created_at": datetime.utcnow().isoformat()
                }
            }
        }
    )
    
    if urgent:
        # Determine specialty and assign doctor
        symptoms = visit.ai_reasoning or visit.observations or "Urgent evaluation needed"
        hospital_target = "AUTO_ASSIGNED"
        
        # Use first hospital for auto assignment
        first_hospital = await db.hospitals.find_one({})
        if first_hospital:
            hospital_target = first_hospital["name"]
            
        routing_res = await assign_referral_to_specialist(db, symptoms, hospital_target)
        if not routing_res.get("success"):
            raise HTTPException(status_code=400, detail=routing_res.get("error_message"))
            
        ref_dict = {
            "patient_id": visit.member_id,
            "household_id": visit.household_id,
            "to_hospital_id": hospital_target,
            "visit_id": visit_id,
            "urgency": "Today",
            "from_worker_id": current_user.id,
            "from_worker_name": current_user.name,
            "asha_observations": str(visit.observations) if visit.observations else "",
            "ai_summary": visit.ai_reasoning,
            "ai_recommended_specialty": routing_res.get("required_specialty"),
            "assigned_specialty": routing_res.get("required_specialty"),
            "assigned_doctor_id": routing_res.get("assigned_doctor_id"),
            "assigned_doctor_name": routing_res.get("assigned_doctor_name"),
            "created_at": datetime.utcnow(),
            "status": "pending",
            "asha_id": current_user.id
        }
        ref_res = await db.referrals.insert_one(ref_dict)

        # BRIDGE TO CLINICIAN QUEUE
        # target_hospital already determined above

        await db.visits.insert_one({
            "patient_id": visit.member_id,
            "hospital_id": hospital_target,
            "hospital_name": hospital_target,
            "doctor_name": routing_res.get("assigned_doctor_name"),
            "assigned_doctor_id": routing_res.get("assigned_doctor_id"),
            "required_specialty": routing_res.get("required_specialty"),
            "date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "chief_complaint": f"ASHA Referral: {visit.ai_reasoning[:100]}...",
            "status": "in_queue",
            "appointment_type": "referred",
            "risk_tag": "urgent",
            "referred_by": current_user.name,
            "referral_id": str(ref_res.inserted_id),
            "diagnosis": [],
            "prescriptions": []
        })
        
    if "_id" in visit_dict: visit_dict.pop("_id")
    return visit_dict

@router.post("/visits/classify-risk", response_model=RiskClassifyResponse)
async def classify_risk(req: RiskClassifyRequest, current_user: UserResponse = Depends(get_current_user)):
    transcript_section = ""
    if req.transcript:
        transcript_section = f"\n    Voice notes from ASHA worker: {req.transcript}"
    
    prompt = f"""
    You are a public health AI assistant in rural India supporting an ASHA worker. 
    Based on these field observations from a home visit, classify the patient risk level.
    
    Patient: {req.member_name or 'Unknown'}, {req.member_age} year old {req.member_gender}
    Visit type: {req.visit_type}
    Observations: {req.observations}{transcript_section}
    
    Respond in this exact JSON format:
    {{
      "risk_level": "LOW",
      "reasoning": "one plain sentence explaining why",
      "recommendation": "one specific action for the ASHA worker to take right now",
      "refer_to_doctor": false
    }}
    
    Possible risk_level values: LOW, WATCH, URGENT
    LOW = manageable at home with basic care advice
    WATCH = needs monitoring, visit again in 3-5 days
    URGENT = needs doctor within 24 hours
    """
    
    groq_api_key = settings.groq_api_key
    if not groq_api_key:
        return RiskClassifyResponse(
            risk_level="WATCH",
            reasoning="Unable to reach AI due to missing API key.",
            recommendation="Use clinical judgment.",
            refer_to_doctor=True
        )
        
    try:
        client = AsyncGroq(api_key=groq_api_key)
        completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        result_str = completion.choices[0].message.content.strip()
        result_json = json.loads(result_str)
        
        # LLM Safety Hardening: validate types and limit strings
        risk_level_str = str(result_json.get("risk_level", "WATCH")).upper().strip()
        if risk_level_str not in ["LOW", "WATCH", "URGENT"]:
            risk_level_str = "WATCH"
            
        refer_to_doctor = result_json.get("refer_to_doctor", False)
        if not isinstance(refer_to_doctor, bool):
            refer_to_doctor = str(refer_to_doctor).lower() in ["true", "1", "yes"]
            
        reasoning = str(result_json.get("reasoning", "AI classified risk based on vital signs."))[:500]
        rec = str(result_json.get("recommendation", "Monitor closely."))[:500]
        
        return RiskClassifyResponse(
            risk_level=risk_level_str,
            reasoning=reasoning,
            recommendation=rec,
            refer_to_doctor=refer_to_doctor
        )
    except Exception as e:
        import traceback
        print(f"Groq API Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI classification failed: {str(e)}")

@router.post("/referrals")
async def send_referral(ref: ReferralCreate, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    
    # Verify household ownership
    hh = await db.households.find_one({"_id": safe_object_id(ref.household_id)})
    if not hh or hh.get("created_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this household")
        
    # Verify patient ownership/scope
    if ref.patient_id and ref.patient_id != "unknown" and len(ref.patient_id) == 24:
        member_found = False
        for m in hh.get("members", []):
            if m.get("patient_id") == ref.patient_id:
                member_found = True
                break
        if not member_found:
            raise HTTPException(status_code=403, detail="Access denied: Patient is not a member of this household")

    # Verify visit ownership/scope
    if ref.visit_id and ref.visit_id != "unknown" and len(ref.visit_id) == 24:
        visit_check = await db.asha_visits.find_one({"_id": safe_object_id(ref.visit_id)})
        if not visit_check or visit_check.get("asha_id") != current_user.id or visit_check.get("household_id") != ref.household_id:
            raise HTTPException(status_code=403, detail="Access denied to this visit")
            
    # Verify target hospital exists — search by name first, then ObjectId
    hospital_check = await db.hospitals.find_one({"name": ref.to_hospital_id})
    if not hospital_check and len(ref.to_hospital_id) == 24:
        try:
            hospital_check = await db.hospitals.find_one({"_id": ObjectId(ref.to_hospital_id)})
        except Exception:
            pass
    if not hospital_check:
        raise HTTPException(status_code=400, detail="Target hospital not found in database")

    # ENSURE PATIENT RECORD EXISTS
    try:
        if not ref.patient_id or len(ref.patient_id) != 24:
            # Create a "Stub" patient if ASHA worker refers someone not in DB
            patient_name = "New Referral Patient"
            if ref.household_id:
                household = await db.households.find_one({"_id": ObjectId(ref.household_id)})
                if household:
                    patient_name = household.get("family_name", "New Referral Patient")

            stub_patient = {
                "name": patient_name,
                "gender": "unknown",
                "district": current_user.district or "Chennai",
                "is_stub": True,
                "created_at": datetime.utcnow()
            }
            p_res = await db.patients.insert_one(stub_patient)
            ref.patient_id = str(p_res.inserted_id)
    except Exception as e:
        print(f"Patient Stub Creation Error: {e}")

    # AI ROUTING: Assign to Specialist
    symptoms = ref.ai_summary or "Clinical assessment requested"
    target_hosp = hospital_check.get("name") if hospital_check else ref.to_hospital_id
    
    routing_res = await assign_referral_to_specialist(db, symptoms, target_hosp)
    if not routing_res.get("success"):
        raise HTTPException(status_code=400, detail=routing_res.get("error_message"))

    ref_dict = ref.dict()
    ref_dict["asha_id"] = current_user.id
    ref_dict["from_worker_id"] = current_user.id
    ref_dict["from_worker_name"] = current_user.name
    ref_dict["created_at"] = datetime.utcnow()
    ref_dict["status"] = "pending"
    ref_dict["ai_recommended_specialty"] = routing_res.get("required_specialty")
    ref_dict["assigned_specialty"] = routing_res.get("required_specialty")
    ref_dict["assigned_doctor_id"] = routing_res.get("assigned_doctor_id")
    ref_dict["assigned_doctor_name"] = routing_res.get("assigned_doctor_name")
    
    res = await db.referrals.insert_one(ref_dict)
    ref_id = str(res.inserted_id)
    ref_dict["id"] = ref_id

    # BRIDGE TO CLINICIAN QUEUE
    await db.visits.insert_one({
        "patient_id": ref.patient_id,
        "hospital_id": ref.to_hospital_id,
        "date": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "chief_complaint": ref.ai_summary or "Referred for clinical assessment",
        "status": "in_queue",
        "appointment_type": "referred",
        "doctor_name": routing_res.get("assigned_doctor_name"),
        "assigned_doctor_id": routing_res.get("assigned_doctor_id"),
        "required_specialty": routing_res.get("required_specialty"),
        "risk_tag": "urgent" if ref.urgency == "Today" else "watch",
        "referred_by": current_user.name,
        "referral_id": ref_id,
        "diagnosis": [],
        "prescriptions": []
    })
    
    # Only link to visit if a real MongoDB ObjectId was provided
    if ref.visit_id and len(ref.visit_id) == 24:
        try:
            await db.asha_visits.update_one(
                {"_id": safe_object_id(ref.visit_id)},
                {"$set": {"manual_referral_id": ref_dict["id"]}}
            )
        except Exception:
            pass  # Visit link is non-critical — don't fail the referral over it
        
    if "_id" in ref_dict: ref_dict.pop("_id")
    return ref_dict

@router.get("/referrals")
async def get_referrals(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    # Fetch real referrals sent by this ASHA worker
    cursor = db.referrals.find({"asha_id": current_user.id}).sort("created_at", -1)
    referrals = await cursor.to_list(length=100)
    
    results = []
    for r in referrals:
        r["id"] = str(r.pop("_id"))
        
        # Join with patient name
        try:
            if r.get("patient_id") and len(str(r["patient_id"])) == 24:
                patient = await db.patients.find_one({"_id": ObjectId(r["patient_id"])})
                r["patient_name"] = patient["name"] if patient else "Unknown Patient"
            else:
                r["patient_name"] = "Unknown Patient"
        except Exception:
            r["patient_name"] = "Unknown Patient"
        
        # Use real hospital name
        r["referred_to"] = r.get("to_hospital_id", "General Hospital")
        
        # Calculate pretty date
        created_at = r.get("created_at", datetime.utcnow())
        r["sent_date"] = created_at.strftime("%d %b, %H:%M")
        
        results.append(r)
        
    return results

@router.get("/my-stats")
async def get_stats(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    asha_id = current_user.id
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_households = await db.households.count_documents({"created_by": asha_id})
    visits_this_month = await db.asha_visits.count_documents({
        "asha_id": asha_id,
        "created_at": {"$gte": month_start}
    })
    referrals_sent = await db.referrals.count_documents({
        "asha_id": asha_id,
        "created_at": {"$gte": month_start}
    })
    urgent_cases = await db.asha_visits.count_documents({
        "asha_id": asha_id,
        "created_at": {"$gte": month_start},
        "risk_level": {"$in": ["URGENT", "urgent", "red"]}
    })
    total_referrals = await db.referrals.count_documents({"asha_id": asha_id})
    seen_referrals = await db.referrals.count_documents({"asha_id": asha_id, "status": "seen"})
    referrals_seen_pct = round((seen_referrals / total_referrals * 100), 1) if total_referrals > 0 else 0.0

    # Households that haven't been visited in the last 14 days
    two_weeks_ago = now - timedelta(days=14)
    needs_visit = await db.households.count_documents({
        "created_by": asha_id,
        "$or": [
            {"last_visit_date": {"$lt": two_weeks_ago}},
            {"last_visit_date": {"$exists": False}}
        ]
    })

    return {
        "total_households": total_households,
        "visits_this_month": visits_this_month,
        "referrals_sent_this_month": referrals_sent,
        "urgent_cases_detected": urgent_cases,
        "referrals_seen_percentage": referrals_seen_pct,
        "households_needs_visit": needs_visit
    }

@router.get("/nearby-facilities")
async def get_nearby_facilities(lat: float = None, lng: float = None, radius_km: float = 10.0, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    hospitals = await db.hospitals.find({}).to_list(length=100)
    
    results = []
    for h in hospitals:
        results.append({
            "id": h["name"],
            "name": h["name"],
            "type": h.get("type", "General Hospital"),
            "distance": None,
            "address": h.get("district", ""),
            "phone": h.get("phone", "")
        })
    return results
@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Endpoint for ASHA workers to upload audio recordings of field visits.
    Uses Groq AI to transcribe voice notes.
    """
    # Rate Limiting: 10 requests per minute per user
    rate_limit_key = f"transcribe:{current_user.id}"
    if not check_rate_limit(rate_limit_key, limit=10, window=60):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.bin']:
        raise HTTPException(status_code=400, detail="Unsupported audio format")
        
    # MIME validation
    allowed_content_types = [
        "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", 
        "audio/m4a", "audio/x-m4a", "audio/ogg", "audio/webm", 
        "video/webm", "application/octet-stream"
    ]
    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Invalid audio MIME type")

    # Generate secure random temp filename
    temp_dir = tempfile.gettempdir()
    temp_filename = f"sync_voice_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    try:
        # Enforce max upload size: 10MB
        MAX_FILE_SIZE = 10 * 1024 * 1024
        file_size = 0
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunk
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail="File too large. Max allowed size is 10MB.")
                buffer.write(chunk)
                
        # Process transcription
        text = await transcription_service.transcribe(temp_path)
        return {"transcript": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

@router.post("/sync")
async def sync_data(
    payload: dict,
    user: UserResponse = Depends(get_current_user)
):
    """
    Batch endpoint to sync offline data.
    Receives lists of households and visits.
    """
    asha_id = str(user.id)
    
    db = get_database()
    if db is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Database unavailable. Check MongoDB connection."}
        )
        
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload structure")
        
    households = payload.get("households", [])
    visits = payload.get("visits", [])
    
    if not isinstance(households, list) or not isinstance(visits, list):
        raise HTTPException(status_code=400, detail="Invalid payload structure")
    
    results = {"households": 0, "visits": 0}
    
    # Sync Households
    for hh in households:
        if not isinstance(hh, dict):
            continue
        hh_id = hh.get('id', '')
        
        if hh_id and len(hh_id) == 24:
            try:
                object_id = ObjectId(hh_id)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid household ID format: {hh_id}")
                
            # Ownership check on existing household
            existing_hh = await db.households.find_one({"_id": object_id})
            if existing_hh:
                if existing_hh.get("created_by") != asha_id:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Access denied: Household {hh_id} does not belong to your scope"
                    )
        else:
            object_id = ObjectId()
            
        await db.households.update_one(
            {"_id": object_id},
            {"$set": {
                "family_name": hh.get('name', hh.get('family_name')),
                "name": hh.get('name'),
                "asha_id": asha_id,
                "created_by": asha_id,
                "risk_level": hh.get('risk_level', 'green'),
                "last_visit_date": hh.get('last_visit_date'),
                "village": hh.get('village', ''),
                "sync_status": "synced"
            }},
            upsert=True
        )
        results["households"] += 1

        # Sync members' visits
        for member in hh.get('members', []):
            if not isinstance(member, dict):
                continue
            for visit in member.get('visits', []):
                if not isinstance(visit, dict):
                    continue
                visit_doc = {
                    "household_id": str(object_id),
                    "asha_id": asha_id,
                    "member_name": member.get('name'),
                    "visit_type": visit.get('visit_type', 'general'),
                    "risk_level": visit.get('risk_level', 'green'),
                    "observations": visit.get('observations_json', {}),
                    "ai_reasoning": visit.get('ai_reasoning', ''),
                    "ai_recommendation": visit.get('ai_recommendation', ''),
                    "voice_notes": visit.get('voice_notes', ''),
                    "created_at": visit.get('created_at', datetime.utcnow().isoformat()),
                    "synced": True
                }
                await db.asha_visits.insert_one(visit_doc)
                results["visits"] += 1

    # Also sync top-level visits array (if sent separately)
    for v in visits:
        if not isinstance(v, dict):
            continue
            
        v_hh_id = v.get("household_id")
        if not v_hh_id:
            raise HTTPException(status_code=400, detail="Household ID is required for synced visits")
            
        try:
            v_hh_obj_id = ObjectId(v_hh_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid household ID in visit")
            
        # Scope check: referenced household must belong to this ASHA worker
        hh_check = await db.households.find_one({"_id": v_hh_obj_id})
        if not hh_check or hh_check.get("created_by") != asha_id:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Household {v_hh_id} for visit does not belong to your scope"
            )
            
        v["asha_id"] = asha_id
        if "created_at" not in v:
            v["created_at"] = datetime.utcnow()
        await db.asha_visits.insert_one(v)
        results["visits"] += 1
        
    return {"status": "success", "synced_count": results}

# --- ASHA NOTIFICATIONS ---

@router.get("/notifications")
async def get_notifications(current_user: UserResponse = Depends(get_current_user)):
    """
    Returns all notifications for this ASHA worker (patient symptom alerts from their village).
    """
    db = get_database()
    cursor = db.notifications.find(
        {"asha_id": str(current_user.id)}
    ).sort("created_at", -1).limit(50)
    notifications = await cursor.to_list(50)

    result = []
    for n in notifications:
        n["id"] = str(n.pop("_id"))
        if "created_at" in n:
            n["created_at"] = n["created_at"].isoformat()
        result.append(n)

    return result

@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Marks a specific notification as read.
    """
    db = get_database()
    await db.notifications.update_one(
        {"_id": safe_object_id(notif_id), "asha_id": str(current_user.id)},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )
    return {"status": "ok"}

@router.patch("/notifications/read-all")
async def mark_all_notifications_read(current_user: UserResponse = Depends(get_current_user)):
    """
    Marks all notifications for this ASHA worker as read.
    """
    db = get_database()
    await db.notifications.update_many(
        {"asha_id": str(current_user.id), "read": False},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )
    return {"status": "ok"}
