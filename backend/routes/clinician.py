from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from database import get_database
from middleware.auth_middleware import get_current_user, require_role
from models.user import UserResponse
from models.patient import PatientResponse, VisitResponse
from config import settings
from groq import AsyncGroq
import json
import os
import tempfile
import shutil
import time
import uuid
from collections import defaultdict
from services.transcription_service import transcription_service

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

# --- SCHEMAS ---

from pydantic import BaseModel, Field

class QueueEntry(BaseModel):
    id: str = Field(alias="_id")
    patient_id: str
    patient_name: str
    age: int
    gender: str
    chief_complaint: str
    wait_time: int  # in minutes
    risk_tag: str  # urgent, watch, low
    appointment_type: str # walkin, referred, followup
    referred_by: Optional[str] = None
    created_at: datetime

    class Config:
        populate_by_name = True

class VisitCreate(BaseModel):
    patient_id: str
    chief_complaint: str
    appointment_type: str = "walkin" # walkin/referred/followup
    referral_id: Optional[str] = None

class PrescriptionInteractionRequest(BaseModel):
    new_medicine: str
    current_medicines: List[str]
    patient_allergies: List[str]

class MedicineItem(BaseModel):
    name: str = ""        # legacy field
    medicine: str = ""    # preferred field — patient side reads this
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None

class PrescriptionSaveRequest(BaseModel):
    visit_id: str
    patient_id: str
    medicines: List[MedicineItem]

class LabOrderCreate(BaseModel):
    visit_id: str
    patient_id: str
    tests: List[str]
    urgency: str
    notes: Optional[str] = None

class ReferralCreate(BaseModel):
    visit_id: str
    patient_id: str
    to_hospital_id: str
    to_speciality: str
    reason: str
    urgency: str
    summary: str

# --- QUEUE ENDPOINTS ---

@router.get("/queue", response_model=List[QueueEntry])
async def get_queue(current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Returns the OPD queue for the doctor's hospital.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    hospital_id = current_user.hospital
    
    # query visits for in_queue
    visits = await db.visits.find({
        "hospital_id": hospital_id,
        "status": "in_queue"
    }).to_list(100)
    
    queue = []
    now = datetime.utcnow()
    
    for v in visits:
        patient = await db.patients.find_one({"_id": ObjectId(v["patient_id"])})
        if not patient:
            continue
            
        # calculate wait time
        created_at = v.get("created_at", v.get("date", now))
        wait_time = int((now - created_at).total_seconds() / 60)
        
        # calculate age
        dob = patient.get("date_of_birth", "2000-01-01")
        try:
            birth_year = int(dob.split("-")[0])
            age = now.year - birth_year
        except:
            age = 0
            
        queue.append({
            "_id": str(v["_id"]),
            "patient_id": str(patient["_id"]),
            "patient_name": patient["name"],
            "age": age,
            "gender": patient["gender"],
            "chief_complaint": v["chief_complaint"],
            "wait_time": wait_time,
            "risk_tag": v.get("risk_tag", "low"),
            "appointment_type": v.get("appointment_type", "walkin"),
            "referred_by": v.get("referred_by"),
            "created_at": created_at
        })
        
    # Sort by risk_tag: urgent > watch > low
    priority = {"urgent": 0, "watch": 1, "low": 2}
    queue.sort(key=lambda x: (priority.get(x["risk_tag"], 3), x["created_at"]))
    
    return queue

@router.post("/queue/add")
async def add_to_queue(data: VisitCreate, current_user: UserResponse = Depends(require_role("doctor", "admin"))):
    """
    Adds a patient to the OPD queue and assigns a risk tag using Groq.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # 1. Fetch patient
    patient = await db.patients.find_one({"_id": safe_object_id(data.patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    risk_tag = "low"
    referred_by = None
    
    # 2. If referral_id, pre-fill and verify scope
    if data.referral_id:
        referral = await db.referrals.find_one({"_id": safe_object_id(data.referral_id)})
        if not referral:
            raise HTTPException(status_code=404, detail="Referral not found")
        if referral.get("to_hospital_id") != current_user.hospital:
            raise HTTPException(status_code=403, detail="Access denied: Referral is for a different hospital")
            
        risk_tag = "watch"
        # Get ASHA name
        asha = await db.users.find_one({"_id": safe_object_id(referral["from_worker_id"])})
        if asha:
            referred_by = asha["name"]

    # 3. Call Groq for initial risk assessment based on chief complaint
    groq_api_key = settings.groq_api_key
    if groq_api_key:
        try:
            client = AsyncGroq(api_key=groq_api_key)
            prompt = f"Assign a medical risk level (URGENT, WATCH, or LOW) for a patient with this complaint: '{data.chief_complaint}'. Respond with JUST the word."
            chat_completion = await client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
            )
            risk_res = chat_completion.choices[0].message.content.strip().lower()
            if "urgent" in risk_res: risk_tag = "urgent"
            elif "watch" in risk_res: risk_tag = "watch"
            else: risk_tag = "low"
        except Exception as e:
            print(f"Groq Queue Error: {e}")

    # 4. Create visit document
    visit_doc = {
        "patient_id": data.patient_id,
        "hospital_id": current_user.hospital,
        "hospital_name": current_user.hospital,
        "doctor_id": str(current_user.id) if current_user.role == "doctor" else None,
        "doctor_name": current_user.name if current_user.role == "doctor" else "Pending Assignment",
        "date": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "chief_complaint": data.chief_complaint,
        "status": "in_queue",
        "appointment_type": data.appointment_type,
        "referral_id": data.referral_id,
        "referred_by": referred_by,
        "risk_tag": risk_tag,
        "diagnosis": [],
        "prescriptions": [],
        "notes": None,
        "follow_up_date": None
    }
    
    result = await db.visits.insert_one(visit_doc)
    return {"status": "success", "visit_id": str(result.inserted_id), "risk_tag": risk_tag}

@router.get("/visits/{visit_id}")
async def get_visit(visit_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Fetches a single visit by ID — used for page refresh recovery in ConsultationScreen.
    """
    db = get_database()
    visit = await db.visits.find_one({"_id": safe_object_id(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return {
        "id": str(visit["_id"]),
        "patient_id": visit.get("patient_id"),
        "hospital_id": visit.get("hospital_id"),
        "status": visit.get("status"),
    }

# --- PATIENT RECORD ENDPOINTS ---

@router.get("/patients/{patient_id}")
async def get_patient_record(patient_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Fetches patient record. Returns full history if consent exists, limited otherwise.
    Always returns allergies.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # 1. Fetch patient
    patient = await db.patients.find_one({"_id": safe_object_id(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # 2. Check consent
    consent = await db.consents.find_one({
        "patient_id": patient_id,
        "granted_to_id": str(current_user.id),
        "expires_at": {"$gt": datetime.utcnow()},
        "revoked": False
    })
    
    # Basic info (always available)
    basic_info = {
        "id": str(patient["_id"]),
        "name": patient["name"],
        "date_of_birth": patient["date_of_birth"],
        "gender": patient["gender"],
        "blood_group": patient.get("blood_group"),
        "allergies": patient.get("allergies", []),
        "abha_number": patient.get("abha_number")
    }
    
    if consent:
        # 3. Fetch full visit history
        visits_cursor = db.visits.find({"patient_id": patient_id}).sort("date", -1).limit(20)
        visits_raw = await visits_cursor.to_list(20)
        formatted_visits = []
        current_meds = []
        for v in visits_raw:
            v["_id"] = str(v["_id"])
            formatted_visits.append(v)
            # Collect active prescriptions from the most recent visit
            if not current_meds and v.get("prescriptions"):
                current_meds = v["prescriptions"]

        # 4. Fetch lab results
        labs_cursor = db.lab_orders.find({"patient_id": patient_id}).sort("ordered_date", -1).limit(20)
        labs_raw = await labs_cursor.to_list(20)
        formatted_labs = []
        for l in labs_raw:
            l["_id"] = str(l["_id"])
            formatted_labs.append(l)

        # 5. Fetch ASHA details for "Loop Reflection"
        active_referral = await db.referrals.find_one({
            "patient_id": patient_id,
            "to_hospital_id": current_user.hospital,
            "status": {"$in": ["pending", "accepted"]}
        })
        if active_referral:
            active_referral["id"] = str(active_referral.pop("_id"))

        asha_history_cursor = db.asha_visits.find({"member_id": patient_id}).sort("created_at", -1).limit(3)
        asha_history = await asha_history_cursor.to_list(3)
        for ah in asha_history:
            ah["id"] = str(ah.pop("_id"))

        return {
            "profile": basic_info,
            "visits": formatted_visits,
            "current_medications": current_meds,
            "lab_results": formatted_labs,
            "consent_status": "granted",
            "active_referral": active_referral,
            "asha_visit_history": asha_history
        }
    else:
        # Check for active referral even without consent
        active_referral = await db.referrals.find_one({
            "patient_id": patient_id,
            "to_hospital_id": current_user.hospital,
            "status": {"$in": ["pending", "accepted"]}
        })
        if active_referral:
            active_referral["id"] = str(active_referral.pop("_id"))

        # Limited record
        return {
            "profile": basic_info,
            "consent_status": "none",
            "active_referral": active_referral,
            "message": "Full records require patient consent. Ask patient to grant access via their Ayu Disha app."
        }

@router.get("/patients/{patient_id}/summary")
async def get_patient_summary(patient_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Generates a 4-sentence AI clinical summary using Groq.
    Works with or without consent — shows limited info without consent.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()

    # Check consent
    consent = await db.consents.find_one({
        "patient_id": patient_id,
        "granted_to_id": str(current_user.id),
        "expires_at": {"$gt": datetime.utcnow()},
        "revoked": False
    })
    has_consent = consent is not None

    # Fetch patient basic info (always available)
    patient = await db.patients.find_one({"_id": safe_object_id(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch data based on consent level
    if has_consent:
        visits = await db.visits.find({"patient_id": patient_id}).sort("date", -1).limit(10).to_list(10)
        labs = await db.lab_orders.find({"patient_id": patient_id}).sort("ordered_date", -1).limit(5).to_list(5)
        referral = await db.referrals.find_one({"patient_id": patient_id, "status": "pending"})
    else:
        # Without consent — only use active referral and chief complaint from queue
        visits = []
        labs = []
        referral = await db.referrals.find_one({
            "patient_id": patient_id,
            "to_hospital_id": current_user.hospital,
            "status": {"$in": ["pending", "accepted"]}
        })

    context = f"Patient: {patient['name']}, Gender: {patient['gender']}, DOB: {patient['date_of_birth']}\n"
    context += f"Allergies: {', '.join(patient.get('allergies', []) or ['None known'])}\n"

    if has_consent:
        context += f"Recent Visits: {json.dumps(visits[:3], default=str)}\n"
        context += f"Recent Labs: {json.dumps(labs[:2], default=str)}\n"
    else:
        context += "Note: Full medical history not available — patient consent not granted.\n"

    if referral:
        context += f"ASHA/Self Referral Summary: {referral.get('ai_summary', '')}\n"
        context += f"Chief Complaint from Referral: {referral.get('asha_observations', '')}\n"

    groq_api_key = settings.groq_api_key
    if not groq_api_key:
        return {"summary": "AI summary unavailable — Groq API key not configured.", "generated_at": datetime.utcnow(), "consent": has_consent}

    try:
        client = AsyncGroq(api_key=groq_api_key)
        prompt = f"""You are a clinical assistant for a doctor in India. Generate a focused pre-consultation summary for this patient in exactly 4 sentences.

Sentence 1: State their main medical conditions or reason for visit today based on available information.
Sentence 2: List any known current medications or note if unavailable due to consent.
Sentence 3: Summarize the most relevant findings or referral notes available.
Sentence 4: State the most important flags — allergies, urgent symptoms, or missing data that the doctor should ask about.

Be precise and clinical. Use medical terminology. No bullet points. No headings. Plain paragraph only. Maximum 120 words total.
{"Full history is available." if has_consent else "Note: Only referral notes available — full history requires patient consent."}

Context:
{context}"""

        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        summary = chat_completion.choices[0].message.content.strip()
        return {"summary": summary, "generated_at": datetime.utcnow(), "consent": has_consent}
    except Exception as e:
        print(f"Summary Error: {e}")
        return {"summary": "Unable to generate summary at this time. Please check Groq API configuration.", "generated_at": datetime.utcnow(), "consent": has_consent}

# --- VISIT ENDPOINTS ---

@router.post("/visits")
async def start_visit(data: VisitCreate, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Starts an active consultation.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Verify patient exists
    patient = await db.patients.find_one({"_id": safe_object_id(data.patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Verify referral scope if provided
    if data.referral_id:
        referral = await db.referrals.find_one({"_id": safe_object_id(data.referral_id)})
        if not referral or referral.get("to_hospital_id") != current_user.hospital or referral.get("patient_id") != data.patient_id:
            raise HTTPException(status_code=403, detail="Access denied: Invalid referral association")
            
    visit_doc = {
        "patient_id": data.patient_id,
        "hospital_id": current_user.hospital,
        "hospital_name": current_user.hospital,
        "doctor_id": str(current_user.id),
        "doctor_name": current_user.name,
        "date": datetime.utcnow(),
        "chief_complaint": data.chief_complaint,
        "status": "active",
        "referral_id": data.referral_id,
        "diagnosis": [],
        "prescriptions": [],
        "notes": None,
        "follow_up_date": None,
        "created_at": datetime.utcnow()
    }
    
    if data.referral_id:
        await db.referrals.update_one(
            {"_id": safe_object_id(data.referral_id)},
            {"$set": {
                "status": "accepted",
                "accepted_at": datetime.utcnow(),
                "doctor_id": str(current_user.id),
                "doctor_name": current_user.name
            }}
        )
        
    result = await db.visits.insert_one(visit_doc)
    return {"id": str(result.inserted_id), "status": "active"}

@router.patch("/visits/{visit_id}")
async def update_visit(visit_id: str, data: Dict[str, Any], current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Updates visit data (diagnosis, notes, follow-up).
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    visit = await db.visits.find_one({"_id": safe_object_id(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.get("hospital_id") != current_user.hospital:
        raise HTTPException(status_code=403, detail="Access denied to this visit")
        
    allowed_fields = ["diagnosis", "notes", "follow_up_date", "chief_complaint", "examination_findings"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if "follow_up_date" in update_data and update_data["follow_up_date"]:
        update_data["follow_up_date"] = datetime.fromisoformat(update_data["follow_up_date"].replace("Z", "+00:00"))
        
    await db.visits.update_one(
        {"_id": safe_object_id(visit_id), "hospital_id": current_user.hospital},
        {"$set": update_data}
    )
    return {"status": "updated"}

@router.post("/visits/{visit_id}/complete")
async def complete_visit(visit_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Completes the visit, removes from queue, and updates referral status.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    visit = await db.visits.find_one({"_id": safe_object_id(visit_id), "hospital_id": current_user.hospital})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or access denied")
        
    # Update visit status and stamp doctor/hospital
    await db.visits.update_one(
        {"_id": safe_object_id(visit_id), "hospital_id": current_user.hospital},
        {"$set": {
            "status": "completed",
            "doctor_id": str(current_user.id),
            "doctor_name": current_user.name,
            "hospital_name": current_user.hospital,
            "completed_at": datetime.utcnow()
        }}
    )
    
    # If a referral was linked, update it to 'seen' with outcomes
    if visit.get("referral_id"):
        await db.referrals.update_one(
            {"_id": safe_object_id(visit["referral_id"])},
            {"$set": {
                "status": "seen",
                "seen_at": datetime.utcnow(),
                "outcome": {
                    "diagnosis": visit.get("diagnosis", []),
                    "prescriptions": visit.get("prescriptions", []),
                    "follow_up_date": visit.get("follow_up_date"),
                    "doctor_notes": visit.get("notes")
                }
            }}
        )
        
    # Add follow-up reminder if date is set (Connection 8)
    if visit.get("follow_up_date"):
        try:
            reminder_date = visit["follow_up_date"] - timedelta(days=1)
            # Ensure reminder is not in the past
            if reminder_date < datetime.utcnow():
                reminder_date = datetime.utcnow() + timedelta(minutes=5)

            await db.scheduled_reminders.insert_one({
                "patient_id": visit["patient_id"],
                "type": "follow_up",
                "reminder_date": reminder_date,
                "message": f"Your follow-up with {current_user.name} is tomorrow at {current_user.hospital}.",
                "sent": False,
                "created_at": datetime.utcnow()
            })
        except Exception as e:
            print(f"Reminder Scheduling Error: {e}")
        
    return {"status": "completed"}

# --- PRESCRIPTION ENDPOINTS ---

@router.post("/prescriptions/check-interaction")
async def check_interaction(data: PrescriptionInteractionRequest, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Checks for drug-drug interactions and drug-allergy risks using Groq.
    """
    groq_api_key = settings.groq_api_key
    if not groq_api_key:
        return {"has_interaction": False, "has_allergy_risk": False, "severity": "none"}

    try:
        client = AsyncGroq(api_key=groq_api_key)
        prompt = f"""You are a clinical pharmacist in India.
        
        New medicine being prescribed: {data.new_medicine}
        Patient's current medications: {data.current_medicines}
        Patient's known allergies: {data.patient_allergies}
        
        Check for:
        1. Drug-drug interactions between the new medicine and current ones
        2. Drug-allergy reactions
        
        Respond ONLY in this exact JSON format with no other text:
        {{
            "has_interaction": true or false,
            "has_allergy_risk": true or false,
            "severity": "none" or "mild" or "moderate" or "severe",
            "warning": "one sentence describing the risk or null",
            "recommendation": "what the doctor should do or null"
        }}"""
        
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        res_data = json.loads(chat_completion.choices[0].message.content)
        
        # Safety Hardening: validate types and limits
        has_interaction = res_data.get("has_interaction", False)
        if not isinstance(has_interaction, bool):
            has_interaction = str(has_interaction).lower() in ["true", "1", "yes"]
            
        has_allergy_risk = res_data.get("has_allergy_risk", False)
        if not isinstance(has_allergy_risk, bool):
            has_allergy_risk = str(has_allergy_risk).lower() in ["true", "1", "yes"]
            
        severity = str(res_data.get("severity", "none")).lower().strip()
        if severity not in ["none", "mild", "moderate", "severe"]:
            severity = "none"
            
        warning = res_data.get("warning")
        if warning is not None:
            warning = str(warning)[:200]
            
        rec = res_data.get("recommendation")
        if rec is not None:
            rec = str(rec)[:500]
            
        return {
            "has_interaction": has_interaction,
            "has_allergy_risk": has_allergy_risk,
            "severity": severity,
            "warning": warning,
            "recommendation": rec
        }
    except Exception as e:
        print(f"Interaction Check Error: {e}")
        return {"has_interaction": False, "has_allergy_risk": False, "severity": "none"}

@router.post("/prescriptions")
async def save_prescription(data: PrescriptionSaveRequest, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Saves prescription and updates visit document.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Scope check on visit
    visit = await db.visits.find_one({"_id": safe_object_id(data.visit_id), "hospital_id": current_user.hospital})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or access denied")
    if visit.get("patient_id") != data.patient_id:
        raise HTTPException(status_code=400, detail="Invalid patient association for this visit")
        
    # Normalize medicine items — store both `name` and `medicine` for compatibility
    normalized = []
    for m in data.medicines:
        d = m.dict()
        medicine_name = d.get("medicine") or d.get("name") or ""
        d["medicine"] = medicine_name
        d["name"] = medicine_name
        normalized.append(d)

    # Update visit
    await db.visits.update_one(
        {"_id": safe_object_id(data.visit_id), "hospital_id": current_user.hospital},
        {"$set": {"prescriptions": normalized}}
    )
    
    return {"status": "success", "message": "Prescription saved and patient notified."}

# --- VOICE NOTE ENDPOINT ---

@router.post("/voice-note")
async def process_voice_note(
    visit_id: str,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(require_role("doctor"))
):
    """
    Transcribes audio and extracts structured clinical data.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Verify visit exists and belongs to doctor's hospital
    visit = await db.visits.find_one({"_id": safe_object_id(visit_id), "hospital_id": current_user.hospital})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or access denied")

    # Rate Limiting: 10 requests per minute per user
    rate_limit_key = f"voice_note:{current_user.id}"
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
    temp_filename = f"clinician_voice_{uuid.uuid4().hex}{ext}"
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
                
        # Transcribe
        transcription = await transcription_service.transcribe(temp_path)
        
        # Structure via Groq
        groq_api_key = settings.groq_api_key
        structured_data = {}
        if groq_api_key:
            client = AsyncGroq(api_key=groq_api_key)
            prompt = f"""You are a professional medical scribe. Extract and structure clinical information from this doctor's dictated consultation note.
            Ensure you translate casual descriptions to proper clinical terminology (e.g., 'tummy ache' -> 'abdominal pain', 'BP high' -> 'elevated blood pressure'). 
            Ensure each field is detailed, clinical, and precise, avoiding generic or single-word descriptions where possible.
            
            Return ONLY this JSON with no other text:
            {{
                "chief_complaint": "detailed, clinical description of patient complaints and history",
                "examination_findings": "clinical examination findings, vital signs, or observations (if mentioned, otherwise detailed 'Not recorded')",
                "diagnosis": ["specific diagnoses with clinical terms, e.g., 'Acute Upper Respiratory Tract Infection' instead of 'Cold'"],
                "plan": "detailed plan including medicine schedules, dosages, frequencies, and general recommendations",
                "follow_up": "specific follow-up instructions (e.g., '3-5 days or immediately if symptoms worsen')",
                "medicines_mentioned": ["list of specific medicine names mentioned"],
                "raw_transcription": "full original transcribed text"
            }}
            
            Dictated note: {transcription}"""
            
            chat_completion = await client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            structured_data = json.loads(chat_completion.choices[0].message.content)
            
            # LLM Output Hardening
            validated_data = {
                "chief_complaint": str(structured_data.get("chief_complaint", "Not recorded"))[:1000],
                "examination_findings": str(structured_data.get("examination_findings", "Not recorded"))[:1000],
                "diagnosis": [str(d)[:100] for d in structured_data.get("diagnosis", []) if d][:10],
                "plan": str(structured_data.get("plan", ""))[:2000],
                "follow_up": str(structured_data.get("follow_up", ""))[:500],
                "medicines_mentioned": [str(m)[:100] for m in structured_data.get("medicines_mentioned", []) if m][:20],
                "raw_transcription": str(structured_data.get("raw_transcription", transcription))[:5000]
            }
            return validated_data
        else:
            return {"raw_transcription": transcription[:5000]}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

# --- LAB & REFERRAL ENDPOINTS ---

@router.post("/lab-orders")
async def create_lab_orders(data: LabOrderCreate, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Creates multiple lab orders.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Scope check on visit
    visit = await db.visits.find_one({"_id": safe_object_id(data.visit_id), "hospital_id": current_user.hospital})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or access denied")
    if visit.get("patient_id") != data.patient_id:
        raise HTTPException(status_code=400, detail="Invalid patient association for this visit")
        
    orders = []
    for test in data.tests:
        order = {
            "visit_id": data.visit_id,
            "patient_id": data.patient_id,
            "test_name": test,
            "ordered_by": str(current_user.name),
            "hospital_id": current_user.hospital,
            "status": "pending",
            "urgency": data.urgency,
            "notes": data.notes,
            "ordered_date": datetime.utcnow()
        }
        orders.append(order)
        
    if orders:
        await db.lab_orders.insert_many(orders)
        
    return {"status": "success", "count": len(orders)}


class LabResultUpdate(BaseModel):
    result: str
    result_notes: Optional[str] = None

@router.patch("/lab-orders/{lab_id}/result")
async def update_lab_result(
    lab_id: str,
    data: LabResultUpdate,
    current_user: UserResponse = Depends(require_role("doctor"))
):
    """
    Doctor enters the lab result — updates status to 'resulted'.
    """
    db = get_database()

    lab = await db.lab_orders.find_one({"_id": safe_object_id(lab_id)})
    if not lab:
        raise HTTPException(status_code=404, detail="Lab order not found")
    if lab.get("hospital_id") != current_user.hospital:
        raise HTTPException(status_code=403, detail="Access denied to this lab order")

    await db.lab_orders.update_one(
        {"_id": safe_object_id(lab_id)},
        {"$set": {
            "result": data.result.strip(),
            "result_notes": data.result_notes,
            "result_date": datetime.utcnow(),
            "resulted_by": current_user.name,
            "status": "resulted"
        }}
    )
    return {"status": "success", "message": "Lab result updated."}

@router.post("/referrals")
async def create_referral(data: ReferralCreate, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Creates a formal referral to another hospital.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Scope check on visit
    visit = await db.visits.find_one({"_id": safe_object_id(data.visit_id), "hospital_id": current_user.hospital})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or access denied")
    if visit.get("patient_id") != data.patient_id:
        raise HTTPException(status_code=400, detail="Invalid patient association for this visit")
        
    # Verify target hospital exists
    target_hospital = await db.hospitals.find_one({"name": data.to_hospital_id})
    if not target_hospital:
        raise HTTPException(status_code=400, detail="Target hospital not found in database")
        
    referral_doc = {
        "visit_id": data.visit_id,
        "patient_id": data.patient_id,
        "to_hospital_id": data.to_hospital_id,
        "to_speciality": data.to_speciality,
        "reason": data.reason,
        "urgency": data.urgency,
        "ai_summary": data.summary,
        "status": "pending",
        "from_worker_id": str(current_user.id),
        "created_at": datetime.utcnow()
    }
    
    result = await db.referrals.insert_one(referral_doc)
    referral_id = str(result.inserted_id)
    
    # Update current visit with referral info
    await db.visits.update_one(
        {"_id": safe_object_id(data.visit_id), "hospital_id": current_user.hospital},
        {"$set": {"out_referral_id": referral_id}}
    )
    
    # Bridge to the target hospital's OPD queue
    await db.visits.insert_one({
        "patient_id": data.patient_id,
        "hospital_id": data.to_hospital_id,
        "date": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "chief_complaint": f"Clinician Referral ({data.to_speciality}): {data.reason[:100]}...",
        "status": "in_queue",
        "appointment_type": "referred",
        "risk_tag": "urgent" if data.urgency in ["urgent", "emergency"] else "watch",
        "referred_by": f"Dr. {current_user.name}",
        "referral_id": referral_id,
        "diagnosis": [],
        "prescriptions": []
    })
    
    return {"status": "success", "referral_id": referral_id}

# --- DIFFERENTIAL DIAGNOSIS ---

@router.get("/differential")
async def get_differential(symptoms: str, patient_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Suggests top 3 likely diagnoses based on symptoms and patient history.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Enforce Consent check!
    consent = await db.consents.find_one({
        "patient_id": patient_id,
        "granted_to_id": str(current_user.id),
        "expires_at": {"$gt": datetime.utcnow()},
        "revoked": False
    })
    if not consent:
        raise HTTPException(status_code=403, detail="Access denied: Patient consent is required to get differential diagnoses")

    patient = await db.patients.find_one({"_id": safe_object_id(patient_id)})
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    
    # Age calc
    birth_year = int(patient["date_of_birth"].split("-")[0])
    age = datetime.utcnow().year - birth_year
    
    # Brief history from recent visits
    recent_visits = await db.visits.find({"patient_id": patient_id}).sort("date", -1).limit(3).to_list(3)
    history = ", ".join([", ".join(v.get("diagnosis", [])) for v in recent_visits if v.get("diagnosis")])
    
    groq_api_key = settings.groq_api_key
    if not groq_api_key: return {"diagnoses": []}
    
    try:
        client = AsyncGroq(api_key=groq_api_key)
        prompt = f"""You are a clinical decision support system for a doctor in India.
        
        Patient: {age} year old {patient['gender']}
        Symptoms: {symptoms}
        Relevant history: {history}
        
        Suggest the top 3 most likely diagnoses. Respond ONLY in this exact JSON:
        {{
            "diagnoses": [
                {{
                    "name": "Diagnosis name",
                    "confidence": "High or Medium or Low",
                    "reasoning": "one sentence max",
                    "suggested_tests": ["test1", "test2"]
                }}
            ]
        }}"""
        
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        res_data = json.loads(chat_completion.choices[0].message.content)
        
        # Hardening LLM outputs
        diagnoses = []
        for item in res_data.get("diagnoses", []):
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "Unknown Diagnosis"))[:150]
            confidence = str(item.get("confidence", "Low")).strip()
            if confidence not in ["High", "Medium", "Low"]:
                confidence = "Low"
            reasoning = str(item.get("reasoning", ""))[:300]
            suggested_tests = [str(t)[:100] for t in item.get("suggested_tests", []) if t][:10]
            diagnoses.append({
                "name": name,
                "confidence": confidence,
                "reasoning": reasoning,
                "suggested_tests": suggested_tests
            })
        return {"diagnoses": diagnoses}
    except Exception as e:
        print(f"Differential Error: {e}")
        return {"diagnoses": []}


# --- DOCTOR PATIENT LIST ENDPOINTS ---

@router.get("/my-patients")
async def get_my_patients(current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Returns all patients managed by this doctor (from completed visits and active consultations).
    """
    db = get_database()
    
    # Debug: Log what we're looking for
    print(f"[DEBUG MY-PATIENTS] Doctor: name='{current_user.name}', id='{current_user.id}', type={type(current_user.id)}")
    
    # Find all visits where this doctor is listed (completed, active, or in queue)
    # Handle multiple possible doctor_id formats and search criteria
    from bson import ObjectId
    
    # Build query conditions
    query_conditions = []
    
    # Try string version of ID
    query_conditions.append({"doctor_id": str(current_user.id)})
    
    # Try original ID format (could be string or ObjectId)
    query_conditions.append({"doctor_id": current_user.id})
    
    # Try doctor name match
    query_conditions.append({"doctor_name": current_user.name})
    
    # Try ObjectId conversion if possible
    try:
        doctor_object_id = ObjectId(str(current_user.id))
        query_conditions.append({"doctor_id": doctor_object_id})
        print(f"[DEBUG MY-PATIENTS] Added ObjectId condition: {doctor_object_id}")
    except Exception as e:
        print(f"[DEBUG MY-PATIENTS] Cannot convert to ObjectId: {e}")
    
    # Also check if doctor_id might be stored in other fields
    query_conditions.append({"doctor": current_user.name})
    query_conditions.append({"assigned_doctor": current_user.name})
    query_conditions.append({"attending_doctor": current_user.name})
    
    print(f"[DEBUG MY-PATIENTS] Query conditions: {len(query_conditions)} conditions")
    
    # Execute query with OR
    visits_cursor = db.visits.find({"$or": query_conditions}).sort("date", -1)
    
    visits = await visits_cursor.to_list(500)
    
    print(f"[DEBUG MY-PATIENTS] Found {len(visits)} total visits for doctor {current_user.name}")
    
    # Debug: Show sample visits
    for i, v in enumerate(visits[:10]):
        print(f"[DEBUG MY-PATIENTS] Visit {i}: id={v.get('_id')}, patient_id={v.get('patient_id')}, "
              f"doctor_id={v.get('doctor_id')} (type: {type(v.get('doctor_id'))}), "
              f"doctor_name='{v.get('doctor_name')}', status={v.get('status')}, "
              f"date={v.get('date')}")
    
    # Also check visits by scanning all visits (for debugging)
    if len(visits) == 0:
        print(f"[DEBUG MY-PATIENTS] No visits found with OR query. Checking all visits...")
        all_visits = await db.visits.find({}).sort("date", -1).to_list(100)
        matching_by_name = [v for v in all_visits if v.get('doctor_name') == current_user.name]
        print(f"[DEBUG MY-PATIENTS] Found {len(matching_by_name)} visits by name match in all visits")
        for v in matching_by_name[:5]:
            print(f"[DEBUG MY-PATIENTS] Matching visit: doctor_id={v.get('doctor_id')}, doctor_name={v.get('doctor_name')}")
    
    # Group by patient_id to get unique patients
    patient_ids = list(set([v.get("patient_id") for v in visits if v.get("patient_id")]))
    
    print(f"[DEBUG MY-PATIENTS] Unique patient IDs: {len(patient_ids)}")
    
    patients = []
    for patient_id in patient_ids:
        patient = await db.patients.find_one({"_id": safe_object_id(patient_id)})
        if not patient:
            continue
            
        # Get patient's visits with this doctor
        patient_visits = [v for v in visits if v.get("patient_id") == patient_id]
        patient_visits.sort(key=lambda x: x.get("date", datetime.utcnow()), reverse=True)
        
        # Calculate age
        dob = patient.get("date_of_birth", "2000-01-01")
        try:
            birth_year = int(dob.split("-")[0])
            age = datetime.utcnow().year - birth_year
        except:
            age = 0
        
        # Get risk level from most recent visit
        risk_level = "low"
        if patient_visits and patient_visits[0].get("risk_tag"):
            risk_map = {"urgent": "high", "watch": "medium", "low": "low"}
            risk_level = risk_map.get(patient_visits[0]["risk_tag"], "low")
        
        # Get diagnoses and conditions
        chronic_conditions = []
        last_diagnosis = None
        for v in patient_visits[:5]:  # Check last 5 visits
            if v.get("diagnosis"):
                last_diagnosis = v["diagnosis"][0] if isinstance(v["diagnosis"], list) else v["diagnosis"]
                chronic_conditions.extend(v.get("diagnosis", []))
        
        # Deduplicate conditions
        chronic_conditions = list(set(chronic_conditions))[:5]
        
        # Get last visit date
        last_visit_date = None
        if patient_visits:
            last_visit_date = patient_visits[0].get("date") or patient_visits[0].get("created_at")
        
        patients.append({
            "patient_id": str(patient["_id"]),
            "name": patient["name"],
            "age": age,
            "gender": patient.get("gender"),
            "mobile": patient.get("mobile"),
            "village": patient.get("village"),
            "district": patient.get("district"),
            "last_visit_date": last_visit_date.isoformat() if last_visit_date else None,
            "last_diagnosis": last_diagnosis,
            "chronic_conditions": chronic_conditions,
            "risk_level": risk_level,
            "total_visits": len(patient_visits)
        })
    
    return patients

@router.get("/referrals")
async def get_referrals(current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Returns all referrals (incoming and outgoing) for this doctor.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Get incoming referrals (to this doctor's hospital)
    print(f"[DEBUG REFERRALS] Doctor {current_user.name} hospital: '{current_user.hospital}'")
    incoming_cursor = db.referrals.find({
        "to_hospital_id": current_user.hospital,
        "status": {"$in": ["pending", "accepted", "rejected", "seen", "completed"]}
    }).sort("created_date", -1)
    
    incoming_refs = await incoming_cursor.to_list(500)
    
    # Debug: Check if hospital matching might be an issue
    if len(incoming_refs) == 0:
        print(f"[DEBUG REFERRALS] No incoming referrals found with hospital_id='{current_user.hospital}'")
        # Check all referrals to see what hospital_ids exist
        all_refs_sample = await db.referrals.find({}).limit(10).to_list(10)
        hospital_ids = set([r.get('to_hospital_id') for r in all_refs_sample])
        print(f"[DEBUG REFERRALS] Sample hospital_ids in referrals: {hospital_ids}")
    
    # Get outgoing referrals (from this doctor)
    # Handle multiple possible from_doctor_id formats
    from bson import ObjectId
    
    outgoing_query_conditions = [
        {"from_doctor_id": str(current_user.id)},  # String format
        {"from_doctor_id": current_user.id},       # Original format
        {"from_doctor_name": current_user.name}    # Name match
    ]
    
    # Try ObjectId conversion
    try:
        doctor_object_id = ObjectId(str(current_user.id))
        outgoing_query_conditions.append({"from_doctor_id": doctor_object_id})
    except:
        pass
    
    outgoing_cursor = db.referrals.find({
        "$or": outgoing_query_conditions,
        "status": {"$in": ["pending", "accepted", "rejected", "seen", "completed"]}
    }).sort("created_date", -1)
    
    outgoing_refs = await outgoing_cursor.to_list(500)
    
    print(f"[DEBUG REFERRALS] Doctor {current_user.name}: found {len(incoming_refs)} incoming, {len(outgoing_refs)} outgoing referrals")
    
    referrals = []
    
    # Process incoming
    for ref in incoming_refs:
        patient = await db.patients.find_one({"_id": safe_object_id(ref.get("patient_id"))})
        asha = await db.users.find_one({"_id": safe_object_id(ref.get("from_worker_id"))}) if ref.get("from_worker_id") else None
        
        if not patient:
            continue
            
        dob = patient.get("date_of_birth", "2000-01-01")
        try:
            birth_year = int(dob.split("-")[0])
            age = datetime.utcnow().year - birth_year
        except:
            age = 0
            
        referrals.append({
            "id": str(ref["_id"]),
            "patient_id": str(patient["_id"]),
            "patient_name": patient["name"],
            "patient_age": age,
            "patient_gender": patient.get("gender"),
            "patient_mobile": patient.get("mobile"),
            "type": "incoming",
            "from_doctor": None,
            "from_facility": None,
            "to_doctor": current_user.name,
            "to_facility": current_user.hospital,
            "reason": ref.get("reason", ""),
            "notes": ref.get("asha_observations", ""),
            "urgency": ref.get("urgency", "routine"),
            "status": ref.get("status", "pending"),
            "created_date": ref.get("created_date", datetime.utcnow()).isoformat() if ref.get("created_date") else datetime.utcnow().isoformat(),
            "updated_date": ref.get("updated_date"),
            "asha_name": asha["name"] if asha else None
        })
    
    # Process outgoing
    for ref in outgoing_refs:
        patient = await db.patients.find_one({"_id": safe_object_id(ref.get("patient_id"))})
        
        if not patient:
            continue
            
        dob = patient.get("date_of_birth", "2000-01-01")
        try:
            birth_year = int(dob.split("-")[0])
            age = datetime.utcnow().year - birth_year
        except:
            age = 0
            
        referrals.append({
            "id": str(ref["_id"]),
            "patient_id": str(patient["_id"]),
            "patient_name": patient["name"],
            "patient_age": age,
            "patient_gender": patient.get("gender"),
            "patient_mobile": patient.get("mobile"),
            "type": "outgoing",
            "from_doctor": current_user.name,
            "from_facility": current_user.hospital,
            "to_doctor": ref.get("to_doctor_name"),
            "to_facility": ref.get("to_hospital_name"),
            "reason": ref.get("reason", ""),
            "notes": ref.get("notes", ""),
            "urgency": ref.get("urgency", "routine"),
            "status": ref.get("status", "pending"),
            "created_date": ref.get("created_date", datetime.utcnow()).isoformat() if ref.get("created_date") else datetime.utcnow().isoformat(),
            "updated_date": ref.get("updated_date"),
            "asha_name": None
        })
    
    return referrals


@router.post("/referrals/{referral_id}/accept")
async def accept_referral(referral_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Accept a referral - adds the patient to doctor's queue.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Find the referral
    referral = await db.referrals.find_one({"_id": safe_object_id(referral_id)})
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    # Check if referral is meant for this doctor's hospital
    if referral.get("to_hospital_id") != current_user.hospital:
        raise HTTPException(status_code=403, detail="This referral is not for your hospital")
    
    # Check if referral is already accepted or completed
    if referral.get("status") in ["accepted", "seen", "completed"]:
        raise HTTPException(status_code=400, detail=f"Referral already {referral.get('status')}")
    
    # Update referral status
    await db.referrals.update_one(
        {"_id": safe_object_id(referral_id)},
        {"$set": {
            "status": "accepted",
            "accepted_at": datetime.utcnow(),
            "doctor_id": str(current_user.id),
            "doctor_name": current_user.name,
            "updated_date": datetime.utcnow()
        }}
    )
    
    # Create a visit in queue for this doctor
    patient = await db.patients.find_one({"_id": safe_object_id(referral.get("patient_id"))})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if there's already an active visit for this patient
    existing_active = await db.visits.find_one({
        "patient_id": referral.get("patient_id"),
        "status": {"$in": ["active", "in_queue"]},
        "hospital_id": current_user.hospital
    })
    
    if existing_active:
        # Update existing visit to link with this referral
        await db.visits.update_one(
            {"_id": existing_active["_id"]},
            {"$set": {
                "referral_id": referral_id,
                "doctor_id": str(current_user.id),
                "doctor_name": current_user.name
            }}
        )
        return {"status": "accepted", "visit_id": str(existing_active["_id"]), "message": "Linked to existing visit"}
    
    # Create new visit in queue
    visit_doc = {
        "patient_id": referral.get("patient_id"),
        "hospital_id": current_user.hospital,
        "hospital_name": current_user.hospital,
        "doctor_id": str(current_user.id),
        "doctor_name": current_user.name,
        "date": datetime.utcnow(),
        "chief_complaint": referral.get("reason", "Referred by ASHA"),
        "status": "in_queue",
        "referral_id": referral_id,
        "appointment_type": "referred",
        "risk_tag": referral.get("urgency", "routine"),
        "referred_by": referral.get("from_worker_name") or "ASHA",
        "diagnosis": [],
        "prescriptions": [],
        "notes": None,
        "follow_up_date": None,
        "created_at": datetime.utcnow()
    }
    
    result = await db.visits.insert_one(visit_doc)
    
    print(f"[DEBUG ACCEPT REFERRAL] Doctor {current_user.name} accepted referral {referral_id}, created visit {result.inserted_id}")
    
    return {"status": "accepted", "visit_id": str(result.inserted_id), "message": "Patient added to queue"}

@router.post("/referrals/{referral_id}/reject")
async def reject_referral(
    referral_id: str, 
    data: Dict[str, Any] = None, 
    current_user: UserResponse = Depends(require_role("doctor"))
):
    """
    Reject a referral with optional reason.
    """
    if not current_user.hospital:
        raise HTTPException(status_code=403, detail="Doctor is not assigned to any hospital")
        
    db = get_database()
    
    # Find the referral
    referral = await db.referrals.find_one({"_id": safe_object_id(referral_id)})
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    # Check if referral is meant for this doctor's hospital
    if referral.get("to_hospital_id") != current_user.hospital:
        raise HTTPException(status_code=403, detail="This referral is not for your hospital")
    
    # Check if referral is already processed
    if referral.get("status") in ["accepted", "seen", "completed", "rejected"]:
        raise HTTPException(status_code=400, detail=f"Referral already {referral.get('status')}")
    
    # Update referral status
    update_data = {
        "status": "rejected",
        "rejected_at": datetime.utcnow(),
        "rejected_by": str(current_user.id),
        "rejected_by_name": current_user.name,
        "updated_date": datetime.utcnow()
    }
    
    if data and data.get("reason"):
        update_data["rejection_reason"] = data["reason"]
    
    await db.referrals.update_one(
        {"_id": safe_object_id(referral_id)},
        {"$set": update_data}
    )
    
    print(f"[DEBUG REJECT REFERRAL] Doctor {current_user.name} rejected referral {referral_id}")
    
    return {"status": "rejected", "message": "Referral rejected"}

@router.get("/debug/current-user")
async def debug_current_user(current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Debug endpoint to check current user information.
    """
    db = get_database()
    
    # Show current user info
    user_info = {
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "user_email": current_user.email,
        "user_role": current_user.role,
        "user_hospital": current_user.hospital,
        "user_id_type": type(current_user.id).__name__
    }
    
    print(f"[DEBUG USER] Current user info: {user_info}")
    
    # Check visits in database
    all_visits = await db.visits.find({}).sort("date", -1).limit(20).to_list(20)
    visits_info = []
    
    for v in all_visits:
        visits_info.append({
            "visit_id": str(v.get('_id')),
            "patient_id": v.get('patient_id'),
            "doctor_id": v.get('doctor_id'),
            "doctor_id_type": type(v.get('doctor_id')).__name__ if v.get('doctor_id') else None,
            "doctor_name": v.get('doctor_name'),
            "status": v.get('status'),
            "hospital_id": v.get('hospital_id'),
            "date": str(v.get('date'))
        })
    
    # Check doctor visits specifically
    matching_visits = []
    for v in all_visits:
        if (v.get('doctor_id') == str(current_user.id) or 
            v.get('doctor_id') == current_user.id or 
            v.get('doctor_name') == current_user.name):
            matching_visits.append({
                "visit_id": str(v.get('_id')),
                "patient_id": v.get('patient_id'),
                "doctor_id": v.get('doctor_id'),
                "doctor_name": v.get('doctor_name'),
                "matched_by": "id_string" if v.get('doctor_id') == str(current_user.id) else
                            "id_original" if v.get('doctor_id') == current_user.id else
                            "name" if v.get('doctor_name') == current_user.name else "unknown"
            })
    
    return {
        "user_info": user_info,
        "total_visits_in_db": len(all_visits),
        "matching_visits_for_user": len(matching_visits),
        "sample_visits": visits_info[:10],
        "user_matching_visits": matching_visits
    }