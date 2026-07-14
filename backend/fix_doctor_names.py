#!/usr/bin/env python3
"""
Fix doctor names issue - create proper doctors and assign visits to them
"""
import os
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
import bcrypt

load_dotenv()

# MongoDB connection
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "ayu_disha_db")

def fix_doctors():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    
    print("Fixing doctor names and associations...")
    
    # Create the doctors Leela S and Bhatathi if they don't exist
    doctors_to_create = [
        {
            "name": "Leela S",
            "email": "leela@ayudisha.com", 
            "mobile": "+919876543210",
            "password": "password123",
            "role": "doctor",
            "hospital": "Government General Hospital Chennai",
            "specialty": "General Medicine",
            "language": "en"
        },
        {
            "name": "Bhatathi", 
            "email": "bhatathi@ayudisha.com",
            "mobile": "+919876543211", 
            "password": "password123",
            "role": "doctor",
            "hospital": "PHC Velachery", 
            "specialty": "Family Medicine",
            "language": "en"
        }
    ]
    
    doctor_ids = {}
    
    for doctor_data in doctors_to_create:
        # Check if doctor exists
        existing = db.users.find_one({"name": doctor_data["name"], "role": "doctor"})
        
        if existing:
            doctor_ids[doctor_data["name"]] = str(existing["_id"])
            print(f"Doctor {doctor_data['name']} already exists: {doctor_ids[doctor_data['name']]}")
        else:
            # Hash password
            hashed_password = bcrypt.hashpw(doctor_data["password"].encode('utf-8'), bcrypt.gensalt())
            doctor_data["password"] = hashed_password.decode('utf-8')
            doctor_data["created_at"] = datetime.utcnow()
            
            result = db.users.insert_one(doctor_data)
            doctor_ids[doctor_data["name"]] = str(result.inserted_id)
            print(f"Created doctor {doctor_data['name']}: {doctor_ids[doctor_data['name']]}")
    
    # Now reassign some existing visits to these doctors
    print("\nReassigning visits to new doctors...")
    
    # Get some existing visits
    existing_visits = list(db.visits.find({}).limit(50))
    print(f"Found {len(existing_visits)} existing visits")
    
    # Split visits between the two doctors
    leela_visits = existing_visits[:25]  # First 25 to Leela S
    bhatathi_visits = existing_visits[25:50]  # Next 25 to Bhatathi
    
    # Update Leela S's visits
    leela_visit_ids = [v["_id"] for v in leela_visits]
    result1 = db.visits.update_many(
        {"_id": {"$in": leela_visit_ids}},
        {
            "$set": {
                "doctor_id": doctor_ids["Leela S"],
                "doctor_name": "Leela S"
            }
        }
    )
    print(f"Assigned {result1.modified_count} visits to Leela S")
    
    # Update Bhatathi's visits  
    bhatathi_visit_ids = [v["_id"] for v in bhatathi_visits]
    result2 = db.visits.update_many(
        {"_id": {"$in": bhatathi_visit_ids}},
        {
            "$set": {
                "doctor_id": doctor_ids["Bhatathi"],
                "doctor_name": "Bhatathi"
            }
        }
    )
    print(f"Assigned {result2.modified_count} visits to Bhatathi")
    
    # Verify the changes
    print("\nVerifying results...")
    leela_count = db.visits.count_documents({"doctor_name": "Leela S"})
    bhatathi_count = db.visits.count_documents({"doctor_name": "Bhatathi"})
    
    print(f"Leela S now has {leela_count} visits")
    print(f"Bhatathi now has {bhatathi_count} visits")
    
    print(f"\nDoctor IDs:")
    print(f"Leela S: {doctor_ids['Leela S']}")
    print(f"Bhatathi: {doctor_ids['Bhatathi']}")
    
    client.close()
    print("Done!")

if __name__ == "__main__":
    fix_doctors()