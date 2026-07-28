from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from database import get_database
from middleware.auth_middleware import get_current_user
from models.user import UserResponse
from models.appointment import (
    SymptomAnalysisRequest, SymptomAnalysisResponse,
    AppointmentRequest, AppointmentResponse, AppointmentAction,
    DoctorAvailability
)
from bson import ObjectId
import json
from groq import AsyncGroq
from config import settings

router = APIRouter()

@router.post("/analyze-symptoms", response_model=SymptomAnalysisResponse)
async def analyze_symptoms(
    request: SymptomAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    AI-powered symptom analysis that recommends specialities and doctors
    """
    db = get_database()
    
    # Build context for AI
    prompt = f"""
    You are a medical AI assistant helping patients find the right doctor.
    
    Patient Information:
    - Symptoms: {request.symptoms}
    - Duration: {request.duration or 'Not specified'}
    - Severity: {request.severity or 'Not specified'}
    - Medical History: {request.medical_history or 'None provided'}
    
    Task: Analyze these symptoms and provide:
    1. A brief, patient-friendly analysis (2-3 sentences)
    2. Recommended medical specialities (list of 2-3 specialities)
    3. Urgency level (low, medium, or high)
    
    Respond in this exact JSON format:
    {{
      "analysis": "brief analysis here",
      "recommended_specialities": ["speciality1", "speciality2"],
      "urgency_level": "medium"
    }}
    
    Be concise and helpful. Use common speciality names like General Medicine, Cardiology, Dermatology, etc.
    """
    
    try:
        if not settings.groq_api_key:
            raise HTTPException(status_code=503, detail="AI service not configured")
            
        client = AsyncGroq(api_key=settings.groq_api_key)
        completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(completion.choices[0].message.content.strip())
        
        # Find doctors matching the recommended specialities
        recommended_doctors = []
        specialities = result.get("recommended_specialities", [])
        
        for speciality in specialities:
            # Find doctors with this speciality
            doctors_cursor = db.users.find({
                "role": "doctor",
                "speciality": {"$regex": speciality, "$options": "i"}
            }).limit(5)
            
            doctors = await doctors_cursor.to_list(5)
            
            for doc in doctors:
                recommended_doctors.append({
                    "id": str(doc["_id"]),
                    "name": doc.get("name", "Dr. Unknown"),
                    "speciality": doc.get("speciality", speciality),
                    "hospital": doc.get("hospital", "Hospital"),
                    "district": doc.get("district", "")
                })
        
        return SymptomAnalysisResponse(
            analysis=result.get("analysis", "Please consult a doctor for proper diagnosis."),
            recommended_specialities=specialities,
            urgency_level=result.get("urgency_level", "medium"),
            recommended_doctors=recommended_doctors
        )
        
    except Exception as e:
        print(f"Symptom analysis error: {e}")
        # Fallback response
        return SymptomAnalysisResponse(
            analysis="Based on your symptoms, we recommend consulting a doctor for proper evaluation.",
            recommended_specialities=["General Medicine"],
            urgency_level="medium",
            recommended_doctors=[]
        )

@router.get("/available-doctors")
async def get_available_doctors(
    speciality: str = None,
    hospital: str = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get list of available doctors with their time slots
    """
    db = get_database()
    
    query = {"role": "doctor"}
    if speciality:
        query["speciality"] = {"$regex": speciality, "$options": "i"}
    if hospital:
        query["hospital"] = hospital
    
    doctors_cursor = db.users.find(query)
    doctors = await doctors_cursor.to_list(100)
    
    result = []
    for doc in doctors:
        # Get doctor's availability (if configured)
        availability = await db.doctor_availability.find_one({"doctor_id": str(doc["_id"])})
        
        result.append({
            "id": str(doc["_id"]),
            "name": doc.get("name", "Dr. Unknown"),
            "speciality": doc.get("speciality", "General Medicine"),
            "hospital": doc.get("hospital", ""),
            "district": doc.get("district", ""),
            "has_availability": availability is not None,
            "available_slots": availability.get("slots", []) if availability else []
        })
    
    return result

@router.post("/request", response_model=AppointmentResponse)
async def request_appointment(
    request: AppointmentRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Patient requests an appointment with a doctor
    """
    db = get_database()
    
    # Verify doctor exists
    try:
        doctor = await db.users.find_one({"_id": ObjectId(request.doctor_id), "role": "doctor"})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")
    
    # Create appointment request
    appointment = {
        "patient_id": current_user.id,
        "patient_name": current_user.name,
        "doctor_id": request.doctor_id,
        "doctor_name": doctor.get("name", "Doctor"),
        "hospital_id": request.hospital_id,
        "hospital_name": doctor.get("hospital", request.hospital_id),
        "requested_date": request.requested_date,
        "requested_time_slot": request.requested_time_slot,
        "symptoms": request.symptoms,
        "reason": request.reason,
        "urgency": request.urgency,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "responded_at": None,
        "response_message": None
    }
    
    result = await db.appointments.insert_one(appointment)
    appointment["id"] = str(result.inserted_id)
    appointment.pop("_id", None)
    
    # Create notification for doctor
    await db.notifications.insert_one({
        "user_id": request.doctor_id,
        "type": "appointment_request",
        "title": f"New Appointment Request from {current_user.name}",
        "message": f"Date: {request.requested_date}, Time: {request.requested_time_slot}",
        "data": {
            "appointment_id": appointment["id"],
            "patient_id": current_user.id,
            "patient_name": current_user.name
        },
        "read": False,
        "created_at": datetime.utcnow()
    })
    
    return AppointmentResponse(**appointment)

@router.get("/my-requests", response_model=List[AppointmentResponse])
async def get_my_appointment_requests(current_user: UserResponse = Depends(get_current_user)):
    """
    Get patient's appointment requests
    """
    db = get_database()
    
    cursor = db.appointments.find({"patient_id": current_user.id}).sort("created_at", -1)
    appointments = await cursor.to_list(100)
    
    result = []
    for appt in appointments:
        appt["id"] = str(appt.pop("_id"))
        result.append(AppointmentResponse(**appt))
    
    return result

@router.get("/pending-requests", response_model=List[AppointmentResponse])
async def get_pending_requests(current_user: UserResponse = Depends(get_current_user)):
    """
    Get pending appointment requests for a doctor
    """
    if current_user.role.value != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access this")
    
    db = get_database()
    
    cursor = db.appointments.find({
        "doctor_id": current_user.id,
        "status": "pending"
    }).sort("created_at", -1)
    
    appointments = await cursor.to_list(100)
    
    result = []
    for appt in appointments:
        appt["id"] = str(appt.pop("_id"))
        result.append(AppointmentResponse(**appt))
    
    return result

@router.post("/respond")
async def respond_to_appointment(
    action: AppointmentAction,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Doctor accepts or rejects an appointment request
    """
    if current_user.role.value != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can respond to appointments")
    
    db = get_database()
    
    # Verify appointment exists and belongs to this doctor
    try:
        appointment = await db.appointments.find_one({
            "_id": ObjectId(action.appointment_id),
            "doctor_id": current_user.id
        })
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found or access denied")
        
        if appointment["status"] != "pending":
            raise HTTPException(status_code=400, detail="Appointment already processed")
        
        # Update appointment status
        new_status = "accepted" if action.action == "accept" else "rejected"
        
        await db.appointments.update_one(
            {"_id": ObjectId(action.appointment_id)},
            {"$set": {
                "status": new_status,
                "response_message": action.message,
                "responded_at": datetime.utcnow()
            }}
        )
        
        # Create notification for patient
        status_text = "accepted" if new_status == "accepted" else "declined"
        await db.notifications.insert_one({
            "user_id": appointment["patient_id"],
            "type": "appointment_response",
            "title": f"Appointment {status_text.capitalize()}",
            "message": f"Dr. {current_user.name} has {status_text} your appointment request for {appointment['requested_date']}",
            "data": {
                "appointment_id": action.appointment_id,
                "status": new_status,
                "message": action.message
            },
            "read": False,
            "created_at": datetime.utcnow()
        })
        
        # If accepted, create a visit entry in the doctor's queue
        if new_status == "accepted":
            await db.visits.insert_one({
                "patient_id": appointment["patient_id"],
                "hospital_id": appointment["hospital_id"],
                "hospital_name": appointment["hospital_name"],
                "doctor_name": current_user.name,
                "date": datetime.fromisoformat(appointment["requested_date"]),
                "created_at": datetime.utcnow(),
                "chief_complaint": appointment["reason"],
                "status": "scheduled",
                "appointment_type": "self_booked",
                "appointment_id": action.appointment_id,
                "time_slot": appointment["requested_time_slot"],
                "diagnosis": [],
                "prescriptions": []
            })
        
        return {
            "status": "success",
            "appointment_status": new_status,
            "message": f"Appointment {status_text} successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Appointment response error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process appointment")

@router.get("/notifications")
async def get_notifications(current_user: UserResponse = Depends(get_current_user)):
    """
    Get user's notifications
    """
    db = get_database()
    
    cursor = db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).limit(50)
    notifications = await cursor.to_list(50)
    
    result = []
    for notif in notifications:
        notif["id"] = str(notif.pop("_id"))
        if "created_at" in notif and isinstance(notif["created_at"], datetime):
            notif["created_at"] = notif["created_at"].isoformat()
        result.append(notif)
    
    return result

@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Mark notification as read
    """
    db = get_database()
    
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    
    return {"status": "success"}
