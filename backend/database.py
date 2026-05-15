from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging
import asyncio

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

def get_database():
    return db.db

async def connect_to_mongo():
    logger.info("Connecting to MongoDB Atlas (Direct Mode)...")
    max_retries = 5
    retry_delay = 5 
    
    for attempt in range(1, max_retries + 1):
        try:
            print(f"📡 Database Connection Attempt {attempt}/{max_retries}...")
            # Use the direct URI from settings
            db.client = AsyncIOMotorClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=20000 # 20s for hotspot/VPN stability
            )
            
            # Ping to verify
            await db.client.admin.command('ping')
            db.db = db.client[settings.database_name]
            
            print("\n" + "╔" + "═"*40 + "╗")
            print("║" + " "*10 + "🚀 DATABASE READY!" + " "*12 + "║")
            print("║" + " "*6 + "Connected to MongoDB Atlas" + " "*8 + "║")
            print("╚" + "═"*40 + "╝" + "\n")
            
            return # Success
            
        except Exception as e:
            print(f"⚠️ Attempt {attempt} failed: {e}")
            if attempt < max_retries:
                await asyncio.sleep(retry_delay)
            else:
                print("\n" + "🔴 ALL CONNECTION ATTEMPTS FAILED")
                print("💡 TIP: Turn on your VPN now to bypass the port block!")
                db.db = None

async def close_mongo_connection():
    if db.client:
        db.client.close()
