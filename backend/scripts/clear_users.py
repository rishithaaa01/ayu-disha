import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pymongo import MongoClient
from config import settings

def clear_users():
    print(f"Connecting to MongoDB at {settings.mongodb_uri.split('@')[-1] if '@' in settings.mongodb_uri else 'Hidden URI'}")
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.database_name]

    collections_to_clear = [
        "users",
        "patients",
        "visits",
        "lab_orders",
        "consents",
        "households",
        "otps"
    ]

    print(f"Clearing user-related collections in database '{settings.database_name}'...")
    for col in collections_to_clear:
        count = db[col].count_documents({})
        if count > 0:
            db[col].delete_many({})
            print(f"[CLEARED] Cleared {count} documents from collection: {col}")
        else:
            print(f"[EMPTY] Collection already empty: {col}")

    print("Database cleanup complete! All existing users and related profiles have been cleared.")
    client.close()

if __name__ == "__main__":
    clear_users()
