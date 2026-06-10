import os
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime, timedelta
from database import get_database
from middleware.auth_middleware import get_current_user
from models.user import UserResponse
from models.patient import PatientCreate, PatientResponse, ConsentCreate, ConsentResponse, VisitResponse
from bson import ObjectId
from groq import AsyncGroq
from config import settings

router = APIRouter()

@router.post("/register", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def register_patient(patient_in: PatientCreate, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    
    # Check if patient profile already exists for this user
    existing_patient = await db.patients.find_one({"user_id": current_user.id})
    if existing_patient:
        raise HTTPException(status_code=400, detail="Patient profile already exists.")
        
    patient_data = patient_in.dict()
    patient_data["user_id"] = current_user.id
    patient_data["created_at"] = datetime.utcnow()
    # Mock ABHA number for now, or just leave it empty
    patient_data["abha_number"] = f"ABHA-{datetime.utcnow().strftime('%Y%m%d')}-{current_user.id[:4].upper()}"
    
    result = await db.patients.insert_one(patient_data)
    patient_data["_id"] = str(result.inserted_id)
    
    return PatientResponse(**patient_data)

@router.get("/me", response_model=PatientResponse)
async def get_patient_profile(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    patient["_id"] = str(patient["_id"])
    return PatientResponse(**patient)

@router.get("/me/visits", response_model=List[VisitResponse])
async def get_patient_visits(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    visits_cursor = db.visits.find({"patient_id": str(patient["_id"])}).sort("date", -1)
    visits = await visits_cursor.to_list(length=100)
    
    results = []
    for v in visits:
        v["_id"] = str(v["_id"])
        # Ensure name fields are strings even if missing in DB
        v["hospital_name"] = v.get("hospital_name", "Unknown Hospital")
        v["doctor_name"] = v.get("doctor_name", "Unknown Doctor")
        results.append(VisitResponse(**v))
        
    return results

@router.get("/me/prescriptions")
async def get_patient_prescriptions(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    visits_cursor = db.visits.find({"patient_id": str(patient["_id"])}).sort("date", -1)
    visits = await visits_cursor.to_list(length=100)
    
    prescriptions = []
    for v in visits:
        if "prescriptions" in v and v["prescriptions"]:
            for p in v["prescriptions"]:
                p_with_meta = dict(p)
                p_with_meta["prescribed_date"] = v["date"].isoformat()
                p_with_meta["prescribed_by"] = v.get("doctor_name", "Unknown Doctor")
                p_with_meta["hospital_name"] = v.get("hospital_name", "Unknown Hospital")
                prescriptions.append(p_with_meta)
                
    return prescriptions

@router.get("/me/lab-results")
async def get_patient_lab_results(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    labs_cursor = db.lab_orders.find({"patient_id": str(patient["_id"])}).sort("ordered_date", -1)
    labs = await labs_cursor.to_list(length=100)
    
    for l in labs:
        l["_id"] = str(l["_id"])
        
    return labs

@router.get("/me/health-summary")
async def get_health_summary(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    patient_id = str(patient["_id"])
    
    # Fetch data
    visits_cursor = db.visits.find({"patient_id": patient_id}).sort("date", -1).limit(5)
    visits = await visits_cursor.to_list(length=5)
    
    labs_cursor = db.lab_orders.find({"patient_id": patient_id}).sort("ordered_date", -1).limit(5)
    labs = await labs_cursor.to_list(length=5)
    
    # Format for prompt
    visit_texts = []
    for v in visits:
        visit_texts.append(f"Date: {v['date']}, Diagnosis: {v.get('diagnosis', [])}, Medicines: {[p.get('medicine') for p in v.get('prescriptions', [])]}")
    
    lab_texts = []
    for l in labs:
        lab_texts.append(f"Test: {l.get('test_name')}, Result: {l.get('result', 'Pending')}")
        
    context = f"""
    Patient Base Info: Conditions/Allergies: {patient.get('allergies', [])}
    Recent Visits:
    {chr(10).join(visit_texts)}
    
    Recent Lab Results:
    {chr(10).join(lab_texts)}
    """
    
    prompt = f"""
    You are a health assistant for an Indian patient. Summarize this patient's health in 3 simple sentences a non-doctor can understand.
    Mention their main conditions, current medicines, and one health tip. Be warm and encouraging.
    Use simple English.
    
    Patient Data:
    {context}
    """
    
    groq_api_key = settings.groq_api_key
    if not groq_api_key:
        return {"summary": "Please update your GROQ API key in settings to enable AI health summaries. For now, everything looks on track."}
        
    try:
        client = AsyncGroq(api_key=groq_api_key)
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
        )
        summary_text = chat_completion.choices[0].message.content.strip()
        return {"summary": summary_text}
    except Exception as e:
        print(f"Groq API Error: {str(e)}")
        return {"summary": "Unable to generate summary at this time. Please check your data manually."}

@router.post("/me/consents", response_model=ConsentResponse)
async def create_consent(consent_in: ConsentCreate, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    consent_data = consent_in.dict()
    consent_data["patient_id"] = str(patient["_id"])
    consent_data["created_at"] = datetime.utcnow()
    consent_data["expires_at"] = datetime.utcnow() + timedelta(days=consent_in.expires_days)
    consent_data["revoked"] = False
    
    result = await db.consents.insert_one(consent_data)
    consent_data["_id"] = str(result.inserted_id)
    
    return ConsentResponse(**consent_data)

@router.get("/me/consents", response_model=List[ConsentResponse])
async def get_consents(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    # Get active consents
    now = datetime.utcnow()
    consents_cursor = db.consents.find({
        "patient_id": str(patient["_id"]),
        "revoked": False,
        "expires_at": {"$gt": now}
    }).sort("created_at", -1)
    
    consents = await consents_cursor.to_list(length=100)
    
    results = []
    for c in consents:
        c["_id"] = str(c["_id"])
        results.append(ConsentResponse(**c))
        
    return results

@router.delete("/me/consents/{consent_id}")
async def revoke_consent(consent_id: str, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    # Revoke it
    result = await db.consents.update_one(
        {"_id": ObjectId(consent_id), "patient_id": str(patient["_id"])},
        {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Consent not found or already revoked.")
        
    return {"message": "Consent revoked successfully"}

from pydantic import BaseModel
import json

class SymptomLogRequest(BaseModel):
    transcript: str
    preferred_hospital_id: str = "Govt General Hospital Chennai"

@router.post("/me/symptoms")
async def log_symptoms(req: SymptomLogRequest, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    patient = await db.patients.find_one({"user_id": current_user.id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    patient_id = str(patient["_id"])
    
    prompt = f"""
    You are a professional clinical triage AI agent.
    Analyze the patient's self-reported symptoms thoroughly. Avoid general or vague explanations. Provide detailed, specific, and clear explanations of what their symptoms could indicate and what exact next steps they must follow.
    
    Patient: {patient.get('name', 'Unknown')}
    Symptoms: {req.transcript}
    
    Respond in this exact JSON format:
    {{
      "risk_level": "LOW",
      "reasoning": "A detailed, clinical explanation (2-3 sentences) of why this risk level was assigned based on the specific symptoms reported.",
      "recommendation": "A detailed, action-oriented health recommendation (2-3 sentences) detailing specific self-care steps, warning signs to watch for, and exact guidelines on when and where to seek care.",
      "refer_to_doctor": false
    }}
    
    Possible risk_level values: LOW, WATCH, URGENT, SEVERE
    LOW = manageable at home with basic care
    WATCH = needs monitoring, see doctor if worsens
    URGENT = needs doctor within 24 hours
    SEVERE = go to emergency immediately
    """
    
    groq_api_key = settings.groq_api_key
    
    result_json = {
        "risk_level": "WATCH",
        "reasoning": "Unable to reach AI for analysis.",
        "recommendation": "Please consult a doctor.",
        "refer_to_doctor": True
    }
    
    if groq_api_key:
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
        except Exception as e:
            print(f"Groq API Error: {str(e)}")
            
    risk_level = result_json.get("risk_level", "WATCH")
    refer_to_doctor = result_json.get("refer_to_doctor", False)
    
    # Force referral if severe
    if risk_level in ["URGENT", "SEVERE"]:
        refer_to_doctor = True
        
    # Auto-Refer
    if refer_to_doctor:
        ref_dict = {
            "patient_id": patient_id,
            "to_hospital_id": req.preferred_hospital_id,
            "urgency": "Immediate" if risk_level == "SEVERE" else "Today",
            "from_worker_id": current_user.id,
            "from_worker_name": current_user.name,
            "asha_observations": f"Self-reported: {req.transcript}",
            "ai_summary": result_json.get("reasoning", ""),
            "created_at": datetime.utcnow(),
            "status": "pending",
            "asha_id": "SELF"
        }
        ref_res = await db.referrals.insert_one(ref_dict)
        
        await db.visits.insert_one({
            "patient_id": patient_id,
            "hospital_id": req.preferred_hospital_id,
            "date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "chief_complaint": f"Self Referral: {req.transcript[:100]}...",
            "status": "in_queue",
            "appointment_type": "referred",
            "risk_tag": "urgent" if risk_level in ["URGENT", "SEVERE"] else "normal",
            "referred_by": "Self (AI Triage)",
            "referral_id": str(ref_res.inserted_id),
            "diagnosis": [],
            "prescriptions": []
        })
        
    result_json["offline_saved"] = False
    return result_json
