from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    mongodb_uri: str
    database_name: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080
    firebase_credentials_path: str
    firebase_credentials_json: Optional[str] = None
    groq_api_key: str
    
    # Optional SMS Gateway configurations
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None
    fast2sms_api_key: Optional[str] = None
    
    # Debug mode controls Master OTP bypass
    debug: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
