from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from models.user import UserResponse, TokenResponse, ProfileCompleteRequest, UserRole
from middleware.auth_middleware import get_current_user, security
from fastapi.security import HTTPAuthorizationCredentials
from database import get_database
from config import settings
from datetime import datetime, timedelta
from jose import jwt
from bson import ObjectId
import random
import uuid
from services.sms_service import sms_service
from services.email_service import email_service
import bcrypt

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

router = APIRouter()

class SendOTPRequest(BaseModel):
    mobile: str

class VerifyOTPRequest(BaseModel):
    mobile: str
    otp: str
    language: str = "en"
    
class VerifyOTPResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    is_new_user: bool
    needs_registration: bool

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    mobile: str
    role: UserRole
    language: str = "en"
    district: Optional[str] = None
    hospital: Optional[str] = None
    village: Optional[str] = None
    speciality: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

def create_access_token(data: dict):
    to_encode = data.copy()
    jti = str(uuid.uuid4())
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({
        "exp": expire,
        "jti": jti,
        "type": "access"
    })
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt, jti

async def create_refresh_token(user_id: str, db) -> str:
    jti = str(uuid.uuid4())
    expire = datetime.utcnow() + timedelta(days=7)
    payload = {
        "sub": user_id,
        "exp": expire,
        "jti": jti,
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    
    await db.refresh_tokens.insert_one({
        "jti": jti,
        "user_id": user_id,
        "expires_at": expire,
        "revoked": False,
        "created_at": datetime.utcnow()
    })
    return encoded_jwt

@router.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    print(f"\n---  OTP Request: {datetime.utcnow().isoformat()} ---")
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
    
    # Send OTP via SMS service (uses Twilio or Fast2SMS if configured, else prints to console)
    sms_res = await sms_service.send_otp(mobile, otp_code)
    
    response_data = {
        "status": "success", 
        "message": f"OTP sent successfully via {sms_res.get('provider')}"
    }
    
    # Return OTP for testing/development if SMS gateway isn't working/configured and debug is enabled
    if sms_res.get("provider") == "console" and settings.debug:
        response_data["otp"] = otp_code
        
    return response_data

@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(request: VerifyOTPRequest):
    print(f"\n---  Login Attempt: {datetime.utcnow().isoformat()} ---")
    
    try:
        db = get_database()
        if db is None:
            raise HTTPException(
                status_code=503,
                detail="Database connection is currently unavailable. Please check your network and try again."
            )

        mobile_number = request.mobile.strip().replace(" ", "")
        if not mobile_number.startswith("+"):
            mobile_number = "+91" + mobile_number

        otp_entered = request.otp.strip()
        print(" Verifying OTP...")

        otp_record = await db.otps.find_one({
            "mobile": mobile_number,
            "otp": otp_entered,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        if not otp_record:
            print(" Invalid or expired OTP code")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP code"
            )
        await db.otps.delete_one({"_id": otp_record["_id"]})
        print(" OTP verified and consumed.")
            
        print(" Searching for user in collection 'users'...")
        try:
            user = await db.users.find_one({"mobile": mobile_number})
            print(f" Database search complete. Found: {bool(user)}")
        except Exception as db_err:
            print(" Database Search Error")
            raise HTTPException(status_code=503, detail="Database search timed out or failed")
            
        is_new_user = False
        
        if not user:
            print(" Registering new user...")
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
                new_user_data.pop("_id", None)
                user_response = UserResponse(**new_user_data)
                print(" New user created")
            except Exception as ins_err:
                print(" User Registration Failed")
                raise HTTPException(status_code=500, detail="Failed to create user record")
        else:
            print(" Existing user found")
            try:
                user_id = str(user.pop("_id"))
                user["id"] = user_id
                if "created_at" not in user:
                    user["created_at"] = datetime.utcnow()
                if "is_profile_complete" not in user:
                    user["is_profile_complete"] = True if user.get("name") and user.get("role") else False
                user_response = UserResponse(**user)
                print(" User response object constructed")
            except Exception as val_err:
                print(" User Data Validation Failed")
                raise HTTPException(status_code=500, detail="Found user data but it's corrupted or incomplete")
            
        print(" Generating tokens...")
        role_value = str(user_response.role.value) if user_response.role else "none"
        access_token, _ = create_access_token({"sub": user_id, "role": role_value})
        refresh_token = await create_refresh_token(user_id, db)
        
        print(f" Login Success! User needs registration: {not user_response.is_profile_complete}")
        return VerifyOTPResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_response,
            is_new_user=is_new_user,
            needs_registration=not user_response.is_profile_complete
        )

    except HTTPException:
        raise
    except Exception as global_err:
        print(" CRITICAL ERROR in verify_otp")
        raise HTTPException(
            status_code=500, 
            detail="An unexpected internal error occurred"
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
        "speciality": request.speciality,
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
            print(f" Automatically creating patient profile for user_id: {current_user.id}")
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
            print(" Patient profile created.")

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

@router.get("/doctors")
async def get_doctors():
    """Returns all registered doctors with their id, name, hospital, and speciality."""
    db = get_database()
    doctors = await db.users.find(
        {"role": "doctor", "is_profile_complete": True},
        {"_id": 1, "name": 1, "hospital": 1, "speciality": 1, "district": 1}
    ).to_list(length=200)
    result = []
    for d in doctors:
        result.append({
            "id":        str(d["_id"]),
            "name":      d.get("name", "Unknown Doctor"),
            "hospital":  d.get("hospital", "—"),
            "speciality":d.get("speciality", "General Medicine"),
            "district":  d.get("district", "—"),
        })
    return result

@router.get("/villages")
async def get_villages():
    db = get_database()
    villages = await db.villages.find({}).to_list(length=200)
    if villages:
        for v in villages:
            v["id"] = str(v.pop("_id"))
        return villages
    # Fallback: static list if no villages seeded yet
    return [
        {"id": "v1", "name": "Kolathur"},
        {"id": "v2", "name": "Madhavaram"},
        {"id": "v3", "name": "Velachery"},
        {"id": "v4", "name": "Adyar"}
    ]

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(request: RefreshRequest):
    token = request.refresh_token.strip()
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.")
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        jti: str = payload.get("jti")
        sub: str = payload.get("sub")
        token_type: str = payload.get("type")
        if not jti or not sub or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    stored_token = await db.refresh_tokens.find_one({"jti": jti})
    if not stored_token:
        raise credentials_exception
        
    if stored_token.get("revoked", False):
        # Rotation reuse defense: revoke all sessions for this user!
        await db.refresh_tokens.update_many(
            {"user_id": sub},
            {"$set": {"revoked": True}}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been reused. All sessions revoked.",
        )
        
    if stored_token.get("expires_at") < datetime.utcnow():
        raise credentials_exception
        
    user = await db.users.find_one({"_id": ObjectId(sub)})
    if not user:
        raise credentials_exception
        
    user_id = str(user.pop("_id"))
    user["id"] = user_id
    user.pop("password_hash", None)
    
    if "is_profile_complete" not in user:
        user["is_profile_complete"] = True if user.get("name") and user.get("role") else False
    if "created_at" not in user:
        user["created_at"] = datetime.utcnow()
        
    user_response = UserResponse(**user)
    
    # Revoke the old refresh token
    await db.refresh_tokens.update_one(
        {"jti": jti},
        {"$set": {"revoked": True}}
    )
    
    # Generate new tokens
    role_value = str(user_response.role.value) if user_response.role else "none"
    access_token, _ = create_access_token({"sub": user_id, "role": role_value})
    new_refresh_token = await create_refresh_token(user_id, db)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=user_response
    )

@router.post("/logout")
async def logout(
    request: LogoutRequest,
    current_user: UserResponse = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.")
        
    refresh_token = request.refresh_token.strip()
    try:
        payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        jti = payload.get("jti")
        token_type = payload.get("type")
        if jti and token_type == "refresh":
            await db.refresh_tokens.update_one(
                {"jti": jti},
                {"$set": {"revoked": True}}
            )
    except Exception:
        pass
        
    access_token = credentials.credentials
    try:
        payload = jwt.decode(access_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        access_jti = payload.get("jti")
        exp = payload.get("exp")
        if access_jti and exp:
            exp_datetime = datetime.utcfromtimestamp(exp)
            await db.denied_tokens.insert_one({
                "jti": access_jti,
                "expires_at": exp_datetime,
                "created_at": datetime.utcnow()
            })
    except Exception:
        pass
        
    return {"status": "success", "message": "Successfully logged out."}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=VerifyOTPResponse)
async def register(request: UserRegisterRequest):
    print(f"\n---  Registration Attempt: {datetime.utcnow().isoformat()} ---")
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.")
        
    email_clean = request.email.strip().lower()
    mobile_clean = request.mobile.strip().replace(" ", "")
    if not mobile_clean.startswith("+"):
        mobile_clean = "+91" + mobile_clean

    # Check unique email
    existing_email = await db.users.find_one({"email": email_clean})
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    # Check unique mobile
    existing_mobile = await db.users.find_one({"mobile": mobile_clean})
    if existing_mobile:
        raise HTTPException(status_code=400, detail="A user with this mobile number already exists.")

    # Hash the password
    password_hash = hash_password(request.password)

    new_user_data = {
        "email": email_clean,
        "password_hash": password_hash,
        "name": request.name.strip(),
        "mobile": mobile_clean,
        "role": request.role.value,
        "language": request.language,
        "district": request.district or "Chennai",
        "hospital": request.hospital,
        "village": request.village,
        "speciality": request.speciality,
        "is_profile_complete": True,
        "created_at": datetime.utcnow()
    }

    try:
        result = await db.users.insert_one(new_user_data)
        user_id = str(result.inserted_id)
        new_user_data["id"] = user_id
        
        # If user registers as a patient, sync patient collection
        if request.role == UserRole.patient:
            patient_data = {
                "user_id": user_id,
                "name": request.name.strip(),
                "date_of_birth": "2000-01-01",
                "gender": "other",
                "blood_group": None,
                "allergies": [],
                "district": request.district or "Chennai",
                "state": "Tamil Nadu",
                "language": request.language or "en",
                "abha_number": f"ABHA-{datetime.utcnow().strftime('%Y%m%d')}-{user_id[:4].upper()}",
                "created_at": datetime.utcnow()
            }
            await db.patients.insert_one(patient_data)
            print(" Linked Patient profile created.")

        new_user_data.pop("password_hash", None)
        new_user_data.pop("_id", None)
        user_response = UserResponse(**new_user_data)
        
    except Exception as ins_err:
        print(" User Registration Failed")
        raise HTTPException(status_code=500, detail="Failed to create user record")

    print(" User registered and profile completed.")
    access_token, _ = create_access_token({"sub": user_id, "role": request.role.value})
    refresh_token = await create_refresh_token(user_id, db)
    
    return VerifyOTPResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response,
        is_new_user=True,
        needs_registration=False
    )

@router.post("/login", response_model=VerifyOTPResponse)
async def login(request: UserLoginRequest):
    print(f"\n---  Credentials Login Attempt: {datetime.utcnow().isoformat()} ---")
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.")

    email_clean = request.email.strip().lower()

    # Search user by email, or fall back to searching by mobile
    user = await db.users.find_one({"email": email_clean})
    if not user:
        # Fallback search if they entered their mobile number in the email field
        mobile_clean = email_clean.replace(" ", "")
        if not mobile_clean.startswith("+"):
            mobile_clean = "+91" + mobile_clean
        user = await db.users.find_one({"mobile": mobile_clean})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if "password_hash" not in user or not user["password_hash"]:
        raise HTTPException(
            status_code=400, 
            detail="Your account does not have a password set. Please log in using Phone OTP."
        )

    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = str(user.pop("_id"))
    user["id"] = user_id
    user.pop("password_hash", None)

    if "is_profile_complete" not in user:
        user["is_profile_complete"] = True if user.get("name") and user.get("role") else False
    if "created_at" not in user:
        user["created_at"] = datetime.utcnow()

    user_response = UserResponse(**user)
    
    role_value = str(user_response.role.value) if user_response.role else "none"
    access_token, _ = create_access_token({"sub": user_id, "role": role_value})
    refresh_token = await create_refresh_token(user_id, db)
    
    print(" Credentials login success")
    return VerifyOTPResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response,
        is_new_user=False,
        needs_registration=not user_response.is_profile_complete
    )

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    print(f"\n---  Forgot Password Request: {datetime.utcnow().isoformat()} ---")
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.")

    email_clean = request.email.strip().lower()
    user = await db.users.find_one({"email": email_clean})
    if not user:
        return {"status": "success", "message": "If this email is registered, you will receive a reset code."}

    # Generate 6-digit reset code
    reset_code = f"{random.randint(100000, 999999)}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=15)

    await db.password_resets.delete_many({"email": email_clean})
    await db.password_resets.insert_one({
        "email": email_clean,
        "code": reset_code,
        "created_at": now,
        "expires_at": expires_at
    })

    # Send email reset code via SMTP
    email_sent = await email_service.send_reset_code(email_clean, reset_code)

    if email_sent:
        msg = "Password reset code sent. Please check your email inbox."
    else:
        msg = "Password reset code generated."

    response_data = {
        "status": "success", 
        "message": msg
    }
    
    # Return reset code for development if SMTP is not configured
    if not email_sent and settings.debug:
        response_data["reset_code"] = reset_code

    return response_data

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    print(f"\n---  Reset Password: {datetime.utcnow().isoformat()} ---")
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.")

    email_clean = request.email.strip().lower()
    code_entered = request.code.strip()

    reset_record = await db.password_resets.find_one({
        "email": email_clean,
        "code": code_entered,
        "expires_at": {"$gt": datetime.utcnow()}
    })

    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    new_password_hash = hash_password(request.new_password)

    await db.users.update_one(
        {"email": email_clean},
        {"$set": {"password_hash": new_password_hash}}
    )

    await db.password_resets.delete_one({"_id": reset_record["_id"]})

    print(" Password reset successfully")
    return {"status": "success", "message": "Password reset successfully. You can now log in."}
