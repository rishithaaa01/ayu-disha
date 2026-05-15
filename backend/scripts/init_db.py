import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings
from datetime import datetime

async def init_db():
    print(f"Connecting to MongoDB at {settings.mongodb_url}")
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]

    # Sample Collections
    collections = [
        "users", "patients", "hospitals", "visits", "lab_orders", 
        "asha_visits", "households", "referrals", "consents", 
        "alerts", "medical_stores", "medicine_orders"
    ]

    for col in collections:
        if col not in await db.list_collection_names():
            await db.create_collection(col)
            print(f"Created collection: {col}")

    # Insert sample data if collections are empty
    users_count = await db.users.count_documents({})
    if users_count == 0:
        sample_user = {
            "name": "Dr. Aarav Sharma",
            "mobile": "+919876543210",
            "abha_number": "14-1111-2222-3333",
            "role": "doctor",
            "language": "en",
            "district": "Pune",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(sample_user)
        print("Inserted sample user.")
    
    print("Database initialization complete.")
    client.close()

if __name__ == "__main__":
    asyncio.run(init_db())
