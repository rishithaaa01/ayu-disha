from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    mongodb_uri: str
    database_name: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 15
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,https://rishithaaa01.github.io"
    firebase_credentials_path: str
    firebase_credentials_json: Optional[str] = None
    groq_api_key: str

    # Cloudinary (free tier — pdf storage)
    cloudinary_cloud_name: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None

    # Optional SMS Gateway configurations
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None
    fast2sms_api_key: Optional[str] = None
    
    # SendGrid for Email OTP (Recommended - 12,000 emails/month free)
    sendgrid_api_key: Optional[str] = None
    sendgrid_from_email: Optional[str] = None
    
    # Optional SMTP configuration for email sending (Gmail or other)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_sender: Optional[str] = None

    # Debug mode controls Master OTP bypass
    debug: bool = False

    class Config:
        env_file = str(Path(__file__).parent / ".env")

settings = Settings()
