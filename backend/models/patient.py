from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PatientCreate(BaseModel):
    name: str
    date_of_birth: str
    gender: str
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = []
    district: str
    state: str
    language: str

class PatientResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    name: str
    date_of_birth: str
    gender: str
    blood_group: Optional[str] = None
    allergies: List[str] = []
    district: str
    state: str
    language: str
    abha_number: Optional[str] = None
    created_at: datetime
    
    class Config:
        populate_by_name = True

class VisitResponse(BaseModel):
    id: str = Field(alias="_id")
    hospital_name: str = "Unknown Hospital"
    doctor_name: str = "Unknown Doctor"
    date: datetime
    chief_complaint: str
    diagnosis: List[str] = []
    prescriptions: List[Dict[str, Any]] = []
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        populate_by_name = True

class ConsentCreate(BaseModel):
    granted_to_id: str
    granted_to_name: str
    data_scope: str
    expires_days: int

class ConsentResponse(BaseModel):
    id: str = Field(alias="_id")
    granted_to_name: str
    data_scope: str
    created_at: datetime
    expires_at: datetime
    revoked: bool

    class Config:
        populate_by_name = True
