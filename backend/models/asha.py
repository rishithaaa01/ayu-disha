from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class MemberCreate(BaseModel):
    name: str
    age: int
    gender: str
    patient_id: Optional[str] = None

class HouseholdCreate(BaseModel):
    family_name: str
    village: str
    block: str
    district: str
    members: List[MemberCreate]

class VisitCreate(BaseModel):
    household_id: str
    member_id: str
    visit_type: str
    observations: Dict[str, Any]
    voice_notes: Optional[str] = None
    risk_level: str
    ai_reasoning: str
    ai_recommendation: str

class RiskClassifyRequest(BaseModel):
    observations: Any = {}
    visit_type: str = "general"
    member_age: Any = 0
    member_gender: str = "unknown"
    member_name: Optional[str] = None
    transcript: Optional[str] = None

class RiskClassifyResponse(BaseModel):
    risk_level: str
    reasoning: str
    recommendation: str
    refer_to_doctor: bool

class ReferralCreate(BaseModel):
    patient_id: Optional[str] = "unknown"
    household_id: str
    to_hospital_id: str
    visit_id: Optional[str] = "unknown"
    urgency: str
    from_worker_name: Optional[str] = None
    asha_observations: Optional[Dict[str, Any]] = None
    ai_summary: Optional[str] = "Urgent referral from ASHA worker"
    notes: Optional[str] = None
