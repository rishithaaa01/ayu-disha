import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pymongo import MongoClient
from config import settings

def seed_metadata():
    print(f"Connecting to MongoDB at {settings.mongodb_uri.split('@')[-1] if '@' in settings.mongodb_uri else 'Hidden URI'}")
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.database_name]

    # 1. Seed Hospitals
    hospitals = [
        {"name": "Govt General Hospital Chennai", "type": "govt", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "PHC Velachery", "type": "govt", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Apollo Clinic Adyar", "type": "private", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Taluk Hospital Vellore", "type": "govt", "district": "Vellore", "state": "Tamil Nadu"},
        {"name": "Royapettah Government Hospital", "type": "govt", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "PHC Kolathur", "type": "govt", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "PHC Madhavaram", "type": "govt", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Stanley Medical College Hospital", "type": "govt", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Kilpauk Medical College Hospital", "type": "govt", "district": "Chennai", "state": "Tamil Nadu"}
    ]

    print("Seeding hospitals...")
    for h in hospitals:
        db.hospitals.update_one({"name": h["name"]}, {"$set": h}, upsert=True)
        print(f"Seeded hospital: {h['name']}")

    # 2. Seed Villages
    villages = [
        {"name": "Kolathur", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Madhavaram", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Velachery", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Adyar", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Thiruvanmiyur", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Mylapore", "district": "Chennai", "state": "Tamil Nadu"},
        {"name": "Tambaram", "district": "Chennai", "state": "Tamil Nadu"}
    ]

    print("\nSeeding villages...")
    for v in villages:
        db.villages.update_one({"name": v["name"]}, {"$set": v}, upsert=True)
        print(f"Seeded village: {v['name']}")

    print("\nMetadata seeding complete!")
    client.close()

if __name__ == "__main__":
    seed_metadata()
