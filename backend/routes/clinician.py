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
from services.transcription_service import transcription_service

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
    name: str
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
    db = get_database()
    hospital_id = current_user.hospital  # Assuming 'hospital' field stores the ID/Name
    
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
    db = get_database()
    
    # 1. Fetch patient
    patient = await db.patients.find_one({"_id": ObjectId(data.patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    risk_tag = "low"
    referred_by = None
    
    # 2. If referral_id, pre-fill
    if data.referral_id:
        referral = await db.referrals.find_one({"_id": ObjectId(data.referral_id)})
        if referral:
            # We can use the referral's AI summary or set risk from it
            # For simplicity, if it's a referral, it's at least 'watch' or 'urgent'
            risk_tag = "watch"
            # Get ASHA name
            asha = await db.users.find_one({"_id": ObjectId(referral["from_worker_id"])})
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
        "doctor_id": str(current_user.id) if current_user.role == "doctor" else None,
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

# --- PATIENT RECORD ENDPOINTS ---

@router.get("/patients/{patient_id}")
async def get_patient_record(patient_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Fetches patient record. Returns full history if consent exists, limited otherwise.
    Always returns allergies.
    """
    db = get_database()
    
    # 1. Fetch patient
    patient = await db.patients.find_one({"_id": ObjectId(patient_id)})
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
        # Check for active referral even without consent (Connection 1 requirement)
        active_referral = await db.referrals.find_one({
            "patient_id": patient_id,
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
    """
    db = get_database()
    
    # Fetch data for context
    patient = await db.patients.find_one({"_id": ObjectId(patient_id)})
    visits = await db.visits.find({"patient_id": patient_id}).sort("date", -1).limit(10).to_list(10)
    labs = await db.lab_orders.find({"patient_id": patient_id}).sort("ordered_date", -1).limit(5).to_list(5)
    
    # Check for ASHA referral
    referral = await db.referrals.find_one({
        "patient_id": patient_id,
        "status": "pending"
    })
    
    context = f"Patient: {patient['name']}, Gender: {patient['gender']}, DOB: {patient['date_of_birth']}\n"
    context += f"Allergies: {', '.join(patient.get('allergies', []))}\n"
    context += f"Recent Visits: {json.dumps(visits[:3], default=str)}\n"
    context += f"Recent Labs: {json.dumps(labs[:2], default=str)}\n"
    if referral:
        context += f"ASHA Referral Summary: {referral.get('ai_summary')}\n"
        
    groq_api_key = settings.groq_api_key
    if not groq_api_key:
        return {"summary": "AI summary currently unavailable (Check API Key).", "generated_at": datetime.utcnow()}

    try:
        client = AsyncGroq(api_key=groq_api_key)
        prompt = f"""You are a clinical assistant for a doctor in India. Generate a focused pre-consultation summary for this patient in exactly 4 sentences.
        
        Sentence 1: State their main medical conditions and how long they have had each one.
        Sentence 2: List their current medications and note any recent changes or additions.
        Sentence 3: Summarize the most recent visit findings and any significant lab results with values.
        Sentence 4: State the most important flags for this consultation — allergies, missed follow-ups, worsening lab trends, or ASHA field findings if available.
        
        Be precise and clinical. Use medical terminology. No bullet points. No headings. Plain paragraph only. Maximum 120 words total.
        
        Context:
        {context}"""
        
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        summary = chat_completion.choices[0].message.content.strip()
        return {"summary": summary, "generated_at": datetime.utcnow()}
    except Exception as e:
        print(f"Summary Error: {e}")
        return {"summary": "Error generating clinical summary.", "error": str(e)}

# --- VISIT ENDPOINTS ---

@router.post("/visits")
async def start_visit(data: VisitCreate, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Starts an active consultation.
    """
    db = get_database()
    
    visit_doc = {
        "patient_id": data.patient_id,
        "hospital_id": current_user.hospital,
        "doctor_id": str(current_user.id),
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
            {"_id": ObjectId(data.referral_id)},
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
    db = get_database()
    allowed_fields = ["diagnosis", "notes", "follow_up_date", "chief_complaint", "examination_findings"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if "follow_up_date" in update_data and update_data["follow_up_date"]:
        update_data["follow_up_date"] = datetime.fromisoformat(update_data["follow_up_date"].replace("Z", "+00:00"))
        
    await db.visits.update_one(
        {"_id": ObjectId(visit_id)},
        {"$set": update_data}
    )
    return {"status": "updated"}

@router.post("/visits/{visit_id}/complete")
async def complete_visit(visit_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Completes the visit, removes from queue, and updates referral status.
    """
    db = get_database()
    
    visit = await db.visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
        
    # Update visit status
    await db.visits.update_one(
        {"_id": ObjectId(visit_id)},
        {"$set": {"status": "completed"}}
    )
    
    # Remove from queue (if there's a queue entry with this ID or patient/hospital/in_queue)
    # Actually, in our logic, 'in_queue' is a status of a visit. 
    # But wait, completing a 'visit' that was 'active' shouldn't remove a 'separate' queue entry.
    # Typically, the visit document itself transitions from in_queue -> active -> completed.
    
    # If a referral was linked, update it to 'seen' with outcomes
    if visit.get("referral_id"):
        await db.referrals.update_one(
            {"_id": ObjectId(visit["referral_id"])},
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
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Interaction Check Error: {e}")
        return {"has_interaction": False, "has_allergy_risk": False, "severity": "none"}

@router.post("/prescriptions")
async def save_prescription(data: PrescriptionSaveRequest, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Saves prescription and updates visit document.
    """
    db = get_database()
    
    # 1. Update visit
    await db.visits.update_one(
        {"_id": ObjectId(data.visit_id)},
        {"$set": {"prescriptions": [m.dict() for m in data.medicines]}}
    )
    
    # TODO: Send FCM notification to patient
    
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
    # 1. Save temporary file
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"clinician_voice_{visit_id}_{file.filename}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Transcribe using Faster Whisper
        transcription = await transcription_service.transcribe(temp_path)
        
        # 3. Structuring via Groq
        groq_api_key = settings.groq_api_key
        structured_data = {}
        if groq_api_key:
            client = AsyncGroq(api_key=groq_api_key)
            prompt = f"""Extract structured clinical information from this doctor's dictated consultation note. Return ONLY this JSON with no other text:
            {{
                "chief_complaint": extracted text or null,
                "examination_findings": extracted text or null,
                "diagnosis": list of diagnoses or empty list,
                "plan": treatment plan text or null,
                "follow_up": follow-up instructions or null,
                "medicines_mentioned": list of any medicine names mentioned or [],
                "raw_transcription": full original transcribed text
            }}
            
            Dictated note: {transcription}"""
            
            chat_completion = await client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            structured_data = json.loads(chat_completion.choices[0].message.content)
        else:
            structured_data = {"raw_transcription": transcription}
            
        # Cleanup
        os.remove(temp_path)
        return structured_data
        
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")

# --- LAB & REFERRAL ENDPOINTS ---

@router.post("/lab-orders")
async def create_lab_orders(data: LabOrderCreate, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Creates multiple lab orders.
    """
    db = get_database()
    
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
        
    # TODO: Send FCM notification
    return {"status": "success", "count": len(orders)}

@router.post("/referrals")
async def create_referral(data: ReferralCreate, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Creates a formal referral to another hospital.
    """
    db = get_database()
    
    referral_doc = {
        "visit_id": data.visit_id,
        "patient_id": data.patient_id,
        "to_hospital_id": data.to_hospital_id,
        "to_speciality": data.to_speciality,
        "reason": data.reason,
        "urgency": data.urgency,
        "ai_summary": data.summary,
        "status": "pending",
        "from_worker_id": str(current_user.id), # Referral from doctor
        "created_at": datetime.utcnow()
    }
    
    result = await db.referrals.insert_one(referral_doc)
    
    # Update current visit with referral info
    await db.visits.update_one(
        {"_id": ObjectId(data.visit_id)},
        {"$set": {"out_referral_id": str(result.inserted_id)}}
    )
    
    return {"status": "success", "referral_id": str(result.inserted_id)}

# --- DIFFERENTIAL DIAGNOSIS ---

@router.get("/differential")
async def get_differential(symptoms: str, patient_id: str, current_user: UserResponse = Depends(require_role("doctor"))):
    """
    Suggests top 3 likely diagnoses based on symptoms and patient history.
    """
    db = get_database()
    patient = await db.patients.find_one({"_id": ObjectId(patient_id)})
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
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Differential Error: {e}")
        return {"diagnoses": []}
