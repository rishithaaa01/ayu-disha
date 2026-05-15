from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    mongodb_uri: str
    database_name: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080
    firebase_credentials_path: str
    groq_api_key: str

    class Config:
        env_file = ".env"

settings = Settings()
