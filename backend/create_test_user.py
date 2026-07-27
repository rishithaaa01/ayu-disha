"""
Create a test user for mobile app testing
Run: python create_test_user.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

async def create_test_user():
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(mongodb_uri)
    db = client["AyuDisha"]
    
    # Test user credentials
    test_email = "test@ayudisha.com"
    test_password = "Test123"
    
    # Check if user already exists
    existing = await db.users.find_one({"email": test_email})
    if existing:
        print(f"✅ Test user already exists: {test_email}")
        print(f"   Password: {test_password}")
        return
    
    # Create test user
    password_hash = hash_password(test_password)
    
    test_user = {
        "email": test_email,
        "password_hash": password_hash,
        "name": "Test User",
        "mobile": "+919876543210",
        "role": "patient",
        "language": "en",
        "district": "Chennai",
        "hospital": None,
        "village": None,
        "speciality": None,
        "is_profile_complete": True,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(test_user)
    print(f"\n✅ Test user created successfully!")
    print(f"   Email: {test_email}")
    print(f"   Password: {test_password}")
    print(f"   User ID: {result.inserted_id}")
    print(f"\n🔐 Use these credentials to test mobile app login")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())
