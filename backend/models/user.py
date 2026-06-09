from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    patient = "patient"
    asha = "asha"
    doctor = "doctor"
    admin = "admin"
    pho = "pho"

class UserCreate(BaseModel):
    name: str
    mobile: str
    role: UserRole
    language: str = "en"
    district: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    mobile: str
    role: Optional[UserRole] = None
    language: str = "en"
    district: Optional[str] = None
    hospital: Optional[str] = None
    village: Optional[str] = None
    is_profile_complete: bool = False
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ProfileCompleteRequest(BaseModel):
    name: str
    role: UserRole
    language: Optional[str] = "en"
    hospital: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
