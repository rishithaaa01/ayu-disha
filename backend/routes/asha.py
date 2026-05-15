import os
import json
import shutil
import tempfile
from fastapi import APIRouter, Depends, HTTPException, Request, status, File, UploadFile
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
from datetime import datetime
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
    
    households_cursor = db.households.find()
    households = await households_cursor.to_list(100)
    
    def get_risk_weight(h):
        risk = h.get("risk_level", "green").lower()
        if risk == "red": return 0
        if risk == "amber": return 1
        return 2
        
    households.sort(key=get_risk_weight)
    
    for h in households:
        h["id"] = str(h.pop("_id"))
    
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
        
    h["id"] = str(h.pop("_id"))
    
    visits_cursor = db.asha_visits.find({"household_id": household_id}).sort("created_at", -1)
    visits = await visits_cursor.to_list(length=10)
    for v in visits:
        v["id"] = str(v.pop("_id"))
        
    h["visit_history"] = visits
    return h

@router.post("/visits")
async def submit_visit(visit: VisitCreate, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    visit_dict = visit.dict()
    visit_dict["asha_id"] = current_user.id
    visit_dict["created_at"] = datetime.utcnow()
    
    res = await db.asha_visits.insert_one(visit_dict)
    visit_id = str(res.inserted_id)
    visit_dict["id"] = visit_id
    
    urgent = visit_dict["risk_level"].lower() in ["red", "urgent"]
    risk = "red" if urgent else ("amber" if visit_dict["risk_level"].lower() in ["watch", "amber"] else "green")
    
    await db.households.update_one(
        {"_id": safe_object_id(visit.household_id)},
        {"$set": {
            "last_visit_date": datetime.utcnow(),
            "risk_level": risk
        }}
    )
    
    if urgent:
        ref_dict = {
            "patient_id": visit.member_id,
            "household_id": visit.household_id,
            "to_hospital_id": "AUTO_ASSIGNED",
            "visit_id": visit_id,
            "urgency": "Today",
            "from_worker_id": current_user.id,
            "from_worker_name": current_user.name,
            "asha_observations": visit.observations,
            "ai_summary": visit.ai_reasoning,
            "created_at": datetime.utcnow(),
            "status": "pending",
            "asha_id": current_user.id
        }
        await db.referrals.insert_one(ref_dict)
        
        # BRIDGE TO CLINICIAN QUEUE
        # For testing, if hospital is AUTO_ASSIGNED, we send to the primary seed hospital
        target_hospital = ref_dict["to_hospital_id"]
        if target_hospital == "AUTO_ASSIGNED":
            target_hospital = "Govt General Hospital Chennai"
            
        await db.visits.insert_one({
            "patient_id": visit.member_id,
            "hospital_id": target_hospital,
            "date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "chief_complaint": f"ASHA Referral: {visit.ai_reasoning[:100]}...",
            "status": "in_queue",
            "appointment_type": "referred",
            "risk_tag": "urgent",
            "referred_by": current_user.name,
            "referral_id": str(ref_dict.get("_id", "manual")),
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
        
        return RiskClassifyResponse(
            risk_level=result_json.get("risk_level", "WATCH"),
            reasoning=result_json.get("reasoning", "AI classified risk based on vital signs."),
            recommendation=result_json.get("recommendation", "Monitor closely."),
            refer_to_doctor=result_json.get("refer_to_doctor", False)
        )
    except Exception as e:
        import traceback
        print(f"Groq API Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI classification failed: {str(e)}")

@router.post("/referrals")
async def send_referral(ref: ReferralCreate, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    ref_dict = ref.dict()
    ref_dict["asha_id"] = current_user.id
    ref_dict["from_worker_id"] = current_user.id
    ref_dict["from_worker_name"] = current_user.name
    ref_dict["created_at"] = datetime.utcnow()
    ref_dict["status"] = "pending"
    
    res = await db.referrals.insert_one(ref_dict)
    ref_id = str(res.inserted_id)
    ref_dict["id"] = ref_id
    
    # ENSURE PATIENT RECORD EXISTS
    try:
        if not ref.patient_id or len(ref.patient_id) != 24:
            # Create a "Stub" patient if ASHA worker refers someone not in DB
            # Fetch patient name from household if available
            patient_name = "New Referral Patient"
            if ref.household_id:
                household = await db.households.find_one({"_id": ObjectId(ref.household_id)})
                if household:
                    # Try to find name in members
                    patient_name = household["family_name"] # Fallback

            stub_patient = {
                "name": patient_name,
                "gender": "unknown",
                "district": current_user.district or "Chennai",
                "is_stub": True,
                "created_at": datetime.utcnow()
            }
            p_res = await db.patients.insert_one(stub_patient)
            ref.patient_id = str(p_res.inserted_id)
            ref_dict["patient_id"] = ref.patient_id
    except Exception as e:
        print(f"Patient Stub Creation Error: {e}")

    # BRIDGE TO CLINICIAN QUEUE
    # Create an active queue entry for the doctor
    await db.visits.insert_one({
        "patient_id": ref.patient_id,
        "hospital_id": ref.to_hospital_id,
        "date": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "chief_complaint": ref.ai_summary or "Referred for clinical assessment",
        "status": "in_queue",
        "appointment_type": "referred",
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
        patient = await db.patients.find_one({"_id": ObjectId(r["patient_id"])})
        r["patient_name"] = patient["name"] if patient else "Unknown Patient"
        
        # Use real hospital name
        r["referred_to"] = r.get("to_hospital_id", "General Hospital")
        
        # Calculate pretty date
        created_at = r.get("created_at", datetime.utcnow())
        r["sent_date"] = created_at.strftime("%d %b, %H:%M")
        
        results.append(r)
        
    return results

@router.get("/my-stats")
async def get_stats(current_user: UserResponse = Depends(get_current_user)):
    return {
        "total_households": 5,
        "visits_this_month": 12,
        "referrals_sent_this_month": 3,
        "urgent_cases_detected": 1,
        "referrals_seen_percentage": 66.0,
        "households_needs_visit": 2
    }

@router.get("/nearby-facilities")
async def get_nearby_facilities(lat: float = None, lng: float = None, radius_km: float = 10.0, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    hospitals = await db.hospitals.find({}).to_list(length=100)
    
    results = []
    for h in hospitals:
        results.append({
            "id": h["name"], # Use Name as ID to match doctor's hospital field
            "name": h["name"],
            "type": h.get("type", "General Hospital"),
            "distance": "1.2 km", 
            "address": h.get("district", "Chennai"),
            "phone": "+91 44 2345 6789"
        })
    return results
@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
):
    """
    Endpoint for ASHA workers to upload audio recordings of field visits.
    Uses Groq AI to transcribe voice notes.
    """
    if not file.filename.endswith(('.wav', '.mp3', '.m4a', '.ogg')):
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    temp_dir = tempfile.gettempdir()
    # Unique temp name
    temp_path = os.path.join(temp_dir, f"sync_voice_{os.urandom(4).hex()}_{file.filename}")
    
    print(f"DEBUG: Receiving audio for reprocessing: {file.filename}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process transcription
        text = await transcription_service.transcribe(temp_path)
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"transcript": text}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"Transcription Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_data(
    payload: dict,
    user: UserResponse = Depends(get_current_user)
):
    """
    Batch endpoint to sync offline data.
    Receives lists of households and visits.
    """
    # Use real user ID from token
    asha_id = str(user.id)
    
    db = get_database()
    if db is None:
        print("DEBUG SYNC: Database connection is unavailable!")
        return JSONResponse(
            status_code=503,
            content={"error": "Database unavailable. Check MongoDB connection."}
        )
    
    results = {"households": 0, "visits": 0}
    
    # Sync Households
    for hh in payload.get('households', []):
        hh_id = hh.get('id', '')
        object_id = ObjectId(hh_id) if len(hh_id) == 24 else ObjectId()
        
        await db.households.update_one(
            {"_id": object_id},
            {"$set": {
                "family_name": hh.get('name', hh.get('family_name')),
                "name": hh.get('name'),
                "asha_id": asha_id,
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
            for visit in member.get('visits', []):
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
    for v in payload.get('visits', []):
        v["asha_id"] = asha_id
        if "created_at" not in v:
            v["created_at"] = datetime.utcnow()
        await db.asha_visits.insert_one(v)
        results["visits"] += 1
        
    return {"status": "success", "synced_count": results}
