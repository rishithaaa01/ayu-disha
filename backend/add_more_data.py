#!/usr/bin/env python3
"""
Add more visits and referrals for testing
"""
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "ayu_disha_db")

def add_test_data():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    
    # Get doctor IDs
    leela = db.users.find_one({"name": "Leela S", "role": "doctor"})
    bhatathi = db.users.find_one({"name": "Bhatathi", "role": "doctor"})
    
    if not leela or not bhatathi:
        print("Doctors not found!")
        return
        
    leela_id = str(leela["_id"])
    bhatathi_id = str(bhatathi["_id"])
    
    print(f"Leela S ID: {leela_id}")
    print(f"Bhatathi ID: {bhatathi_id}")
    
    # Get existing patients
    patients = list(db.patients.find({}).limit(10))
    print(f"Found {len(patients)} patients")
    
    if len(patients) < 5:
        print("Not enough patients, creating more...")
        # Create some dummy patients
        for i in range(5):
            patient_doc = {
                "name": f"Test Patient {i+1}",
                "date_of_birth": "1985-01-01", 
                "gender": "male" if i % 2 == 0 else "female",
                "mobile": f"+9198765432{i:02d}",
                "village": f"Test Village {i+1}",
                "district": "Chennai",
                "created_at": datetime.utcnow()
            }
            result = db.patients.insert_one(patient_doc)
            patients.append({"_id": result.inserted_id, **patient_doc})
    
    now = datetime.utcnow()
    
    # Create visits for Bhatathi (he had 0)
    print("\nCreating visits for Bhatathi...")
    for i, patient in enumerate(patients[:5]):
        visit_doc = {
            "patient_id": str(patient["_id"]),
            "hospital_id": "PHC Velachery",
            "hospital_name": "PHC Velachery", 
            "doctor_id": bhatathi_id,
            "doctor_name": "Bhatathi",
            "status": "completed",
            "date": now - timedelta(days=i+1),
            "created_at": now - timedelta(days=i+1),
            "chief_complaint": f"Test complaint {i+1}",
            "diagnosis": [f"Test diagnosis {i+1}"],
            "prescriptions": [
                {
                    "medicine": f"Medicine {i+1}",
                    "dosage": "1 tablet",
                    "frequency": "twice daily",
                    "duration": "5 days"
                }
            ]
        }
        result = db.visits.insert_one(visit_doc)
        print(f"Created visit {result.inserted_id} for patient {patient['name']}")
    
    # Create some referrals between the two doctors
    print("\nCreating referrals...")
    for i in range(3):
        patient = patients[i]
        referral_doc = {
            "patient_id": str(patient["_id"]),
            "from_hospital_id": "PHC Velachery",
            "from_hospital_name": "PHC Velachery",
            "from_doctor_id": bhatathi_id,
            "from_doctor_name": "Bhatathi",
            "to_hospital_id": "Government General Hospital Chennai", 
            "to_hospital_name": "Government General Hospital Chennai",
            "to_doctor_id": leela_id,
            "to_doctor_name": "Leela S",
            "reason": f"Referral reason {i+1}",
            "status": "pending" if i == 0 else "accepted",
            "created_at": now - timedelta(hours=i+1),
            "updated_at": now - timedelta(hours=i+1)
        }
        if referral_doc["status"] == "accepted":
            referral_doc["accepted_at"] = now - timedelta(minutes=30)
            
        result = db.referrals.insert_one(referral_doc)
        print(f"Created referral {result.inserted_id}")
    
    # Verify counts
    print("\nFinal verification...")
    leela_visits = db.visits.count_documents({"doctor_name": "Leela S"})
    bhatathi_visits = db.visits.count_documents({"doctor_name": "Bhatathi"})
    total_referrals = db.referrals.count_documents({})
    
    print(f"Leela S: {leela_visits} visits")
    print(f"Bhatathi: {bhatathi_visits} visits") 
    print(f"Total referrals: {total_referrals}")
    
    client.close()
    print("Done!")

if __name__ == "__main__":
    add_test_data()