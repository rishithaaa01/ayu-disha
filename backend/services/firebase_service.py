import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status
from config import settings
import os
import json

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        # 1. Try loading from raw JSON string (ideal for Render deployment)
        if settings.firebase_credentials_json:
            try:
                creds_dict = json.loads(settings.firebase_credentials_json)
                cred = credentials.Certificate(creds_dict)
                firebase_admin.initialize_app(cred)
                print("[Firebase] Firebase Admin SDK initialized successfully via FIREBASE_CREDENTIALS_JSON setting.")
            except Exception as json_err:
                print(f"Error initializing Firebase Admin from JSON string: {json_err}")
        
        # 2. Fallback to local file path
        if not firebase_admin._apps and settings.firebase_credentials_path and os.path.exists(settings.firebase_credentials_path):
            cred = credentials.Certificate(settings.firebase_credentials_path)
            firebase_admin.initialize_app(cred)
            print(f"[Firebase] Firebase Admin SDK initialized successfully via file: {settings.firebase_credentials_path}")
            
        if not firebase_admin._apps:
            print("Warning: Firebase credentials not found. Ensure either firebase_credentials_json or firebase_credentials.json is configured.")
except Exception as e:
    print(f"Error initializing Firebase Admin: {e}")

def verify_id_token(token: str) -> str:
    """
    Takes a Firebase ID token from the mobile app, verifies it with Firebase Admin,
    returns the phone number if valid, raises HTTPException if invalid.
    """
    try:
        # Verify the token against Firebase Auth API
        decoded_token = auth.verify_id_token(token)
        phone_number = decoded_token.get("phone_number")
        if not phone_number:
            raise ValueError("No phone number associated with this token.")
        return phone_number
    except Exception as e:
        # For local development where Firebase isn't fully configured yet,
        # we can accept a mock token that starts with "MOCK_"
        if token.startswith("MOCK_"):
            return "+91" + token.split("_")[1]
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase Token: {str(e)}"
        )
