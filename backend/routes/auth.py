from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from models.user import UserResponse, TokenResponse, ProfileCompleteRequest, UserRole
from middleware.auth_middleware import get_current_user
from services.firebase_service import verify_id_token
from database import get_database
from config import settings
from datetime import datetime, timedelta
from jose import jwt
from bson import ObjectId
import random

router = APIRouter()

class SendOTPRequest(BaseModel):
    mobile: str

class VerifyOTPRequest(BaseModel):
    mobile: str
    otp: str
    language: str = "en"
    
class VerifyOTPResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    is_new_user: bool
    needs_registration: bool

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt

@router.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    print(f"\n--- 📲 OTP Request: {datetime.utcnow().isoformat()} ---")
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection is currently unavailable."
        )
    
    mobile = request.mobile.strip()
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number is required")
    
    # Clean the phone number (remove spaces)
    mobile = mobile.replace(" ", "")
    if not mobile.startswith("+"):
        mobile = "+91" + mobile
        
    # Generate 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"
    
    # Store in database with 5 minute expiration
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=5)
    
    # Delete old OTPs for this number
    await db.otps.delete_many({"mobile": mobile})
    
    # Insert new OTP
    await db.otps.insert_one({
        "mobile": mobile,
        "otp": otp_code,
        "created_at": now,
        "expires_at": expires_at
    })
    
    print("\n" + "╔" + "═"*50 + "╗")
    print(f"║ [OTP SENT] Mobile: {mobile:<15} Code: {otp_code} ║")
    print("╚" + "═"*50 + "╝\n")
    
    return {"status": "success", "message": "OTP sent successfully"}

@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(request: VerifyOTPRequest):
    print(f"\n--- 🔐 Login Attempt: {datetime.utcnow().isoformat()} ---")
    
    try:
        db = get_database()
        if db is None:
            print("❌ Database connection is None!")
            raise HTTPException(
                status_code=503,
                detail="Database connection is currently unavailable. Please check your network and try again."
            )
            
        mobile_number = request.mobile.strip().replace(" ", "")
        if not mobile_number.startswith("+"):
            mobile_number = "+91" + mobile_number
            
        otp_entered = request.otp.strip()
        
        print(f"📲 Verifying DB-backed OTP for {mobile_number}...")
        
        # Verify against our 'otps' collection
        otp_record = await db.otps.find_one({
            "mobile": mobile_number,
            "otp": otp_entered,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not otp_record:
            print("❌ Invalid or expired OTP code")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP code"
            )
            
        # Delete OTP record to prevent reuse
        await db.otps.delete_one({"_id": otp_record["_id"]})
        print("✅ OTP verified and consumed.")
            
        print(f"🔍 Searching for user in collection 'users'...")
        try:
            user = await db.users.find_one({"mobile": mobile_number})
            print(f"✅ Database search complete. Found: {bool(user)}")
        except Exception as db_err:
            print(f"❌ Database Search Error: {db_err}")
            raise HTTPException(status_code=503, detail=f"Database search timed out or failed: {str(db_err)}")
            
        is_new_user = False
        
        if not user:
            print(f"📝 Registering new user: {mobile_number}")
            is_new_user = True
            new_user_data = {
                "name": None,
                "mobile": mobile_number,
                "role": None,
                "language": request.language or "en",
                "is_profile_complete": False,
                "created_at": datetime.utcnow()
            }
            try:
                result = await db.users.insert_one(new_user_data)
                user_id = str(result.inserted_id)
                new_user_data["id"] = user_id
                user_response = UserResponse(**new_user_data)
                print(f"✅ New user created with ID: {user_id}")
            except Exception as ins_err:
                print(f"❌ User Registration Failed: {ins_err}")
                raise HTTPException(status_code=500, detail=f"Failed to create user record: {str(ins_err)}")
        else:
            print(f"👤 Existing user found: {mobile_number}")
            try:
                user_id = str(user.pop("_id"))
                user["id"] = user_id
                if "created_at" not in user:
                    user["created_at"] = datetime.utcnow()
                if "is_profile_complete" not in user:
                    user["is_profile_complete"] = True if user.get("name") and user.get("role") else False
                user_response = UserResponse(**user)
                print(f"✅ User response object constructed for ID: {user_id}")
            except Exception as val_err:
                print(f"❌ User Data Validation Failed: {val_err}")
                raise HTTPException(status_code=500, detail=f"Found user data but it's corrupted or incomplete: {str(val_err)}")
            
        print("🎟️ Generating access token...")
        role_value = str(user_response.role.value) if user_response.role else "none"
        access_token = create_access_token({"sub": user_id, "role": role_value})
        
        print(f"✨ Login Success! User needs registration: {not user_response.is_profile_complete}")
        return VerifyOTPResponse(
            access_token=access_token,
            user=user_response,
            is_new_user=is_new_user,
            needs_registration=not user_response.is_profile_complete
        )

    except HTTPException:
        raise
    except Exception as global_err:
        print(f"🛑 CRITICAL ERROR in verify_otp: {global_err}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected internal error occurred: {str(global_err)}"
        )

@router.post("/complete-profile", response_model=UserResponse)
async def complete_profile(request: ProfileCompleteRequest, current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    
    update_data = {
        "name": request.name,
        "role": request.role.value,
        "language": request.language,
        "hospital": request.hospital,
        "village": request.village,
        "district": request.district,
        "is_profile_complete": True
    }
    
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )
    
    # If this is a patient, make sure there is a record in the 'patients' collection
    if request.role == UserRole.patient:
        existing_patient = await db.patients.find_one({"user_id": current_user.id})
        if not existing_patient:
            print(f"📝 Automatically creating patient profile for user_id: {current_user.id}")
            patient_data = {
                "user_id": current_user.id,
                "name": request.name,
                "date_of_birth": "2000-01-01",  # default
                "gender": "other",              # default
                "blood_group": None,
                "allergies": [],
                "district": request.district or "Chennai",
                "state": "Tamil Nadu",          # default
                "language": request.language or "en",
                "abha_number": f"ABHA-{datetime.utcnow().strftime('%Y%m%d')}-{current_user.id[:4].upper()}",
                "created_at": datetime.utcnow()
            }
            await db.patients.insert_one(patient_data)
            print("✅ Patient profile created.")

    updated_user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    user_id = str(updated_user.pop("_id"))
    updated_user["id"] = user_id
    
    return UserResponse(**updated_user)

@router.get("/hospitals")
async def get_hospitals():
    db = get_database()
    hospitals = await db.hospitals.find({}).to_list(length=100)
    for h in hospitals:
        h["id"] = str(h.pop("_id"))
    return hospitals

@router.get("/villages")
async def get_villages():
    # For now returning a static list of villages in the Chennai district
    return [
        {"id": "v1", "name": "Kolathur"},
        {"id": "v2", "name": "Madhavaram"},
        {"id": "v3", "name": "Velachery"},
        {"id": "v4", "name": "Adyar"}
    ]

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: UserResponse = Depends(get_current_user)):
    access_token = create_access_token({"sub": current_user.id, "role": current_user.role.value})
    return TokenResponse(
        access_token=access_token,
        user=current_user
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
