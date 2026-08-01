import asyncio
import os
from typing import List, Dict

# Set dummy key for local testing if not set
if not os.getenv("GROQ_API_KEY"):
    from config import settings
    if not settings.groq_api_key:
        print("Skipping AI test because GROQ_API_KEY is not set.")
        exit(0)

from services.ai_routing import assign_referral_to_specialist, determine_referral_speciality

class MockCursor:
    def __init__(self, data):
        self.data = data
    async def to_list(self, length):
        return self.data

class MockCollection:
    def __init__(self, name, data):
        self.name = name
        self.data = data

    def find(self, query):
        results = []
        for d in self.data:
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                results.append(d)
        return MockCursor(results)
        
    async def find_one(self, query):
        if self.name == "hospitals":
            return {"name": "Test Hospital", "_id": "h1"}
        return None
        
    async def count_documents(self, query):
        doc_id = query.get("assigned_doctor_id")
        # Let's say doctor d1 has 5 visits, d2 has 2 visits
        if doc_id == "d1": return 5
        if doc_id == "d2": return 2
        return 0

class MockDB:
    def __init__(self):
        self.users = MockCollection("users", [
            {"_id": "d1", "name": "Dr. Priya (Busy)", "role": "doctor", "hospital": "Test Hospital", "speciality": "Gynecology"},
            {"_id": "d2", "name": "Dr. Kavita (Free)", "role": "doctor", "hospital": "Test Hospital", "speciality": "Gynecology"},
            {"_id": "d3", "name": "Dr. Ortho", "role": "doctor", "hospital": "Test Hospital", "speciality": "Orthopedics"}
        ])
        self.hospitals = MockCollection("hospitals", [])
        self.visits = MockCollection("visits", [])

async def run_tests():
    db = MockDB()
    
    print("--- Testing Specialty AI ---")
    spec1 = await determine_referral_speciality("Patient is 8 months pregnant, experiencing severe abdominal pain.")
    print(f"Pregnancy symptoms -> {spec1} (Expected: Gynecology)")
    assert spec1 == "Gynecology", f"Got {spec1}"
    
    spec2 = await determine_referral_speciality("Patient fell from bike, suspected femur fracture.")
    print(f"Fracture symptoms -> {spec2} (Expected: Orthopedics)")
    assert spec2 == "Orthopedics", f"Got {spec2}"
    
    spec3 = await determine_referral_speciality("Patient feels a little tired today.")
    print(f"Vague symptoms -> {spec3} (Expected: General Medicine)")
    assert spec3 == "General Medicine", f"Got {spec3}"
    
    print("\n--- Testing Doctor Assignment (Least Workload) ---")
    res1 = await assign_referral_to_specialist(db, "Pregnancy issues", "Test Hospital")
    print(f"Assigning Gynecology -> Success: {res1['success']}, Doctor: {res1.get('assigned_doctor_name')} (ID: {res1.get('assigned_doctor_id')})")
    assert res1["success"] == True
    assert res1["assigned_doctor_id"] == "d2" # Because d2 has 2 visits, d1 has 5
    
    print("\n--- Testing Missing Specialist Error ---")
    res2 = await assign_referral_to_specialist(db, "Chest pain, possible heart attack", "Test Hospital")
    print(f"Assigning Cardiology -> Success: {res2['success']}, Error: {res2.get('error_message')}")
    assert res2["success"] == False
    assert "No Cardiology specialist is currently available" in res2["error_message"]
    
    print("\nAll tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(run_tests())
