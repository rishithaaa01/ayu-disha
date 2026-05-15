import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv() # Force it to read your .env file!

# Hardcode fallback for local
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "ayu_disha_db")

def seed_data():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    
    print("Inserting seed data...")

    # Dummy user Priya Sharma
    dummy_user = db.users.find_one({"mobile": "+919999999999"})
    if not dummy_user:
        result = db.users.insert_one({
            "name": "Priya Sharma",
            "mobile": "+919999999999",
            "role": "patient",
            "language": "en",
            "created_at": datetime.utcnow()
        })
        user_id = str(result.inserted_id)
        print(f"Created Dummy User: {user_id}")
    else:
        user_id = str(dummy_user["_id"])
        print(f"Found Dummy User: {user_id}")

    # Check if patient exists
    dummy_patient = db.patients.find_one({"user_id": user_id})
    if dummy_patient:
        print("Patient profile already exists, clearing previous test data...")
        patient_id = str(dummy_patient["_id"])
        db.visits.delete_many({"patient_id": patient_id})
        db.lab_orders.delete_many({"patient_id": patient_id})
        db.consents.delete_many({"patient_id": patient_id})
    else:
        patient_data = {
            "user_id": user_id,
            "name": "Priya Sharma",
            "date_of_birth": "1990-05-15",
            "gender": "female",
            "blood_group": "B+",
            "allergies": ["Penicillin"],
            "district": "Chennai",
            "state": "Tamil Nadu",
            "language": "ta",
            "abha_number": "91-1234-5678-9012",
            "created_at": datetime.utcnow()
        }
        res = db.patients.insert_one(patient_data)
        patient_id = str(res.inserted_id)
        print("Created Student Priya Profile")

    # Seed Visits
    now = datetime.utcnow()
    visits = [
        {
            "patient_id": patient_id,
            "hospital_name": "Government General Hospital Chennai",
            "doctor_name": "Dr. Ramesh Kumar",
            "date": now - timedelta(days=90),
            "chief_complaint": "Fever and body pain",
            "diagnosis": ["Viral fever", "Mild dehydration"],
            "prescriptions": [
                { "medicine": "Paracetamol 500mg", "dosage": "1 tablet", "frequency": "3 times a day", "duration": "5 days" },
                { "medicine": "ORS Sachets", "dosage": "1 sachet in water", "frequency": "After every loose stool", "duration": "3 days" }
            ],
            "follow_up_date": now - timedelta(days=83)
        },
        {
            "patient_id": patient_id,
            "hospital_name": "PHC Velachery",
            "doctor_name": "Dr. Meena Iyer",
            "date": now - timedelta(days=30),
            "chief_complaint": "Routine diabetes checkup",
            "diagnosis": ["Type 2 Diabetes - stable"],
            "prescriptions": [
                { "medicine": "Metformin 500mg", "dosage": "1 tablet", "frequency": "Twice daily after meals", "duration": "30 days - ongoing" }
            ],
            "follow_up_date": now
        },
        {
            "patient_id": patient_id,
            "hospital_name": "Apollo Clinic Adyar",
            "doctor_name": "Dr. Suresh Patel",
            "date": now - timedelta(days=7),
            "chief_complaint": "Blood sugar levels high",
            "diagnosis": ["Type 2 Diabetes - needs monitoring"],
            "prescriptions": [
                { "medicine": "Metformin 500mg", "dosage": "1 tablet", "frequency": "Twice daily after meals", "duration": "30 days" },
                { "medicine": "Glimepiride 1mg", "dosage": "1 tablet", "frequency": "Once daily before breakfast", "duration": "30 days" }
            ],
            "follow_up_date": now + timedelta(days=7)
        }
    ]
    db.visits.insert_many(visits)
    print("Inserted 3 Visits")

    # Seed Lab Orders
    lab_orders = [
        {
            "patient_id": patient_id,
            "test_name": "HbA1c (Glycated Hemoglobin)",
            "ordered_date": now - timedelta(days=30),
            "status": "resulted",
            "result": "7.8% — Slightly above normal range",
            "result_date": now - timedelta(days=28),
            "ordered_by": "Dr. Meena Iyer"
        },
        {
            "patient_id": patient_id,
            "test_name": "Fasting Blood Glucose",
            "ordered_date": now - timedelta(days=7),
            "status": "resulted",
            "result": "142 mg/dL — Above normal",
            "result_date": now - timedelta(days=6),
            "ordered_by": "Dr. Suresh Patel"
        }
    ]
    db.lab_orders.insert_many(lab_orders)
    print("Inserted 2 Lab Orders")

    # --- Phase 3 ASHA Seed Data ---
    print("Seeding ASHA Worker data...")
    asha_user = db.users.find_one({"mobile": "+919876543210"})
    if not asha_user:
        res = db.users.insert_one({
            "name": "Kavitha Devi",
            "mobile": "+919876543210",
            "role": "asha",
            "district": "Chennai",
            "language": "en",
            "created_at": datetime.utcnow()
        })
        asha_user_id = str(res.inserted_id)
        print(f"Created ASHA worker: {asha_user_id}")
    else:
        asha_user_id = str(asha_user["_id"])
        print(f"Found ASHA worker: {asha_user_id}")

    # Create a patient profile for Lakshmi (Maternal Health Loop Demo)
    lakshmi_user = db.users.insert_one({
        "name": "Lakshmi Murugan",
        "mobile": "+919999999998",
        "role": "patient",
        "created_at": now
    })
    lakshmi_patient = db.patients.insert_one({
        "user_id": str(lakshmi_user.inserted_id),
        "name": "Lakshmi Murugan",
        "date_of_birth": "1998-08-15",
        "gender": "female",
        "district": "Chennai"
    })
    lakshmi_id = str(lakshmi_patient.inserted_id)

    db.households.delete_many({"created_by": asha_user_id})
    households = [
       {
           "family_name": "Murugan Family",
           "village": "Kolathur",
           "block": "Chennai Block",
           "district": "Chennai",
           "members": [
               {"name": "Lakshmi", "age": 26, "gender": "female", "details": "pregnant, 7 months", "patient_id": lakshmi_id}
           ],
           "last_visit_date": now - timedelta(days=8),
           "risk_level": "red",
           "open_issues": ["Missed ANC checkup", "High BP reported"],
           "created_by": asha_user_id,
           "created_at": now
       },
       {
           "family_name": "Rajan Family",
           "village": "Kolathur",
           "block": "Chennai Block",
           "district": "Chennai",
           "members": [
               {"name": "Rajan", "age": 58, "gender": "male", "details": "diabetic", "patient_id": "dummy_rajan"},
               {"name": "Sumathi", "age": 54, "gender": "female"}
           ],
           "last_visit_date": now - timedelta(days=5),
           "risk_level": "amber",
           "open_issues": ["Blood sugar uncontrolled", "Missed medication 3 days"],
           "created_by": asha_user_id,
           "created_at": now
       },
       {
           "family_name": "Kumar Family",
           "village": "Madhavaram",
           "block": "Chennai Block",
           "district": "Chennai",
           "members": [
               {"name": "Priya", "age": 28, "gender": "female", "patient_id": patient_id},
               {"name": "Arjun", "age": 3, "gender": "male", "details": "child"},
               {"name": "Deepak", "age": 32, "gender": "male"}
           ],
           "last_visit_date": now - timedelta(days=2),
           "risk_level": "green",
           "open_issues": [],
           "created_by": asha_user_id,
           "created_at": now
       },
       {
           "family_name": "Selvam Family",
           "village": "Madhavaram",
           "block": "Chennai Block",
           "district": "Chennai",
           "members": [
               {"name": "Baby Kavya", "age": 0, "gender": "female", "details": "8 months"},
               {"name": "Divya", "age": 24, "gender": "female", "details": "new mother"}
           ],
           "last_visit_date": now - timedelta(days=4),
           "risk_level": "amber",
           "open_issues": ["Baby underweight", "Breastfeeding issues"],
           "created_by": asha_user_id,
           "created_at": now
       },
       {
           "family_name": "Pandian Family",
           "village": "Kolathur",
           "block": "Chennai Block",
           "district": "Chennai",
           "members": [
               {"name": "Pandian", "age": 45, "gender": "male"},
               {"name": "Meena", "age": 42, "gender": "female"}
           ],
           "last_visit_date": now - timedelta(days=1),
           "risk_level": "green",
           "open_issues": [],
           "created_by": asha_user_id,
           "created_at": now
       }
    ]
    db.households.insert_many(households)
    print("Inserted 5 ASHA Households")

    # --- Phase 4 Clinician Seed Data ---
    print("Seeding Clinician data...")
    
    # 1. Hospital
    hospital_data = {
        "name": "Govt General Hospital Chennai",
        "type": "govt",
        "district": "Chennai",
        "state": "Tamil Nadu"
    }
    db.hospitals.update_one({"name": hospital_data["name"]}, {"$set": hospital_data}, upsert=True)
    print("Hospital Seeded")

    # 2. Doctor user
    doctor_data = {
        "name": "Dr. Ramesh Kumar",
        "mobile": "+919876543211",
        "role": "doctor",
        "speciality": "General Medicine",
        "hospital": "Govt General Hospital Chennai",
        "language": "en",
        "created_at": datetime.utcnow()
    }
    res = db.users.update_one({"mobile": doctor_data["mobile"]}, {"$set": doctor_data}, upsert=True)
    doctor = db.users.find_one({"mobile": doctor_data["mobile"]})
    doctor_id = str(doctor["_id"])
    print(f"Doctor Seeded: {doctor_id}")

    # 3. OPD Queue
    # We'll clear old visits for these new test patients to keep it clean
    db.visits.delete_many({"hospital_id": "Govt General Hospital Chennai", "status": "in_queue"})
    
    # Need IDs for other patients
    p2 = db.patients.insert_one({"name": "Suresh Babu", "age": 45, "gender": "male", "district": "Chennai", "date_of_birth": "1979-01-01"}).inserted_id
    p3 = db.patients.insert_one({"name": "Anitha Krishnan", "age": 32, "gender": "female", "district": "Chennai", "date_of_birth": "1992-01-01"}).inserted_id
    p4 = db.patients.insert_one({"name": "Mohammed Farhan", "age": 28, "gender": "male", "district": "Chennai", "date_of_birth": "1996-01-01"}).inserted_id

    queue_visits = [
        {
            "patient_id": patient_id, # Priya Sharma
            "hospital_id": "Govt General Hospital Chennai",
            "hospital_name": "Govt General Hospital Chennai",
            "doctor_id": doctor_id,
            "doctor_name": "Dr. Ramesh Kumar",
            "date": now - timedelta(minutes=5),
            "created_at": now - timedelta(minutes=5),
            "chief_complaint": "High BP + headache",
            "status": "in_queue",
            "appointment_type": "referred",
            "risk_tag": "urgent",
            "referred_by": "Kavitha Devi (ASHA)",
            "referral_summary": "26F pregnant, BP 150/95, missed ANC, ankle swelling"
        },
        {
            "patient_id": str(p2),
            "hospital_id": "Govt General Hospital Chennai",
            "hospital_name": "Govt General Hospital Chennai",
            "doctor_id": doctor_id,
            "doctor_name": "Dr. Ramesh Kumar",
            "date": now - timedelta(minutes=12),
            "created_at": now - timedelta(minutes=12),
            "chief_complaint": "Chest discomfort since morning",
            "status": "in_queue",
            "appointment_type": "walkin",
            "risk_tag": "watch"
        },
        {
            "patient_id": str(p3),
            "hospital_id": "Govt General Hospital Chennai",
            "hospital_name": "Govt General Hospital Chennai",
            "doctor_id": doctor_id,
            "doctor_name": "Dr. Ramesh Kumar",
            "date": now - timedelta(minutes=18),
            "created_at": now - timedelta(minutes=18),
            "chief_complaint": "Routine diabetes follow-up",
            "status": "in_queue",
            "appointment_type": "followup",
            "risk_tag": "low"
        },
        {
            "patient_id": str(p4),
            "hospital_id": "Govt General Hospital Chennai",
            "hospital_name": "Govt General Hospital Chennai",
            "doctor_id": doctor_id,
            "doctor_name": "Dr. Ramesh Kumar",
            "date": now - timedelta(minutes=25),
            "created_at": now - timedelta(minutes=25),
            "chief_complaint": "Fever and cold for 3 days",
            "status": "in_queue",
            "appointment_type": "walkin",
            "risk_tag": "low"
        }
    ]
    db.visits.insert_many(queue_visits)
    print("OPD Queue Seeded")

    # 4. Consent for Priya to Dr. Ramesh
    db.consents.update_one(
        {"patient_id": patient_id, "granted_to_id": doctor_id},
        {
            "$set": {
                "patient_id": patient_id,
                "granted_to_id": doctor_id,
                "granted_to_name": "Dr. Ramesh Kumar",
                "data_scope": "full",
                "created_at": now,
                "expires_at": now + timedelta(days=30),
                "revoked": False
            }
        },
        upsert=True
    )
    print("Consent Seeded")

    print(f"Data seeded successfully! Doctor Mobile: +919876543211")
    print(f"Test ASHA Mobile: +919876543210")
    client.close()

if __name__ == "__main__":
    seed_data()
