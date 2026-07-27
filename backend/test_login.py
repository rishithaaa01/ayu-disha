"""
Test login credentials directly against the backend
Run: python test_login.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        print(f"Error verifying: {e}")
        return False

async def test_login():
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(mongodb_uri)
    db = client["AyuDisha"]
    
    # List all users with passwords
    print("\n=== Users with Password Login ===")
    users = await db.users.find(
        {"password_hash": {"$exists": True, "$ne": None}},
        {"email": 1, "name": 1, "role": 1}
    ).to_list(100)
    
    if not users:
        print("❌ No users with passwords found in database")
    else:
        print(f"Found {len(users)} user(s) with password login:\n")
        for u in users:
            print(f"  📧 {u.get('email')}")
            print(f"     Name: {u.get('name')}")
            print(f"     Role: {u.get('role')}")
            print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_login())
