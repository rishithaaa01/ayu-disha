from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, time

class TimeSlot(BaseModel):
    day_of_week: str  # Monday, Tuesday, etc.
    start_time: str   # "09:00"
    end_time: str     # "10:00"
    is_available: bool = True

class DoctorAvailability(BaseModel):
    doctor_id: str
    slots: List[TimeSlot]

class SymptomAnalysisRequest(BaseModel):
    symptoms: str
    duration: Optional[str] = None
    severity: Optional[str] = None
    medical_history: Optional[str] = None

class SymptomAnalysisResponse(BaseModel):
    analysis: str
    recommended_specialities: List[str]
    urgency_level: str  # low, medium, high
    recommended_doctors: List[dict]

class AppointmentRequest(BaseModel):
    doctor_id: str
    hospital_id: str
    requested_date: str  # ISO date string
    requested_time_slot: str  # "09:00-10:00"
    symptoms: str
    reason: str
    urgency: Optional[str] = "routine"

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    hospital_name: str
    requested_date: str
    requested_time_slot: str
    symptoms: str
    reason: str
    status: str  # pending, accepted, rejected
    created_at: datetime
    response_message: Optional[str] = None
    responded_at: Optional[datetime] = None

class AppointmentAction(BaseModel):
    appointment_id: str
    action: str  # accept or reject
    message: Optional[str] = None
