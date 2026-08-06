import json
import logging
from typing import Optional
from groq import AsyncGroq
from config import settings

logger = logging.getLogger(__name__)

VALID_SPECIALTIES = [
    "General Medicine",
    "Gynecology",
    "Orthopedics",
    "ENT",
    "Cardiology",
    "Pulmonology",
    "Neurology",
    "Dermatology",
    "Pediatrics",
    "Ophthalmology",
    "Gastroenterology",
    "Psychiatry",
    "Oncology",
    "Urology",
    "Endocrinology"
]

async def determine_referral_speciality(symptoms_text: str, client_type: str = "web") -> str:
    """
    Uses Groq or Local AI to analyze symptoms/complaints and return the most appropriate medical specialty.
    Defaults to "General Medicine" if vague or if an error occurs.
    """
    if not symptoms_text or not symptoms_text.strip():
        return "General Medicine"
        
    if client_type == "mobile":
        try:
            print("📡 Determining referral specialty via LOCAL AI (Random Forest)...")
            from services.local_ai_service import local_ai
            res = local_ai.predict_referral(symptoms_text)
            spec = res.get("recommended_specialty", "General Medicine")
            print(f"✅ Local AI recommended specialty: {spec}")
            
            # Ensure it matches valid specialties
            for valid_specialty in VALID_SPECIALTIES:
                if valid_specialty.lower() == spec.lower():
                    return valid_specialty
                    
            return "General Medicine"
        except Exception as e:
            logger.error(f"Error in Local AI referral prediction: {e}")
            return "General Medicine"
            
    # Web Flow -> Groq
    groq_api_key = settings.groq_api_key
    if not groq_api_key:
        logger.warning("Groq API key not found. Defaulting specialty to General Medicine.")
        return "General Medicine"
        
    client = AsyncGroq(api_key=groq_api_key)
    
    prompt = f"""
    You are an intelligent triage assistant. Based on the following patient symptoms or medical summary, 
    determine the MOST appropriate medical specialty for referral. 
    
    If the symptoms are vague, inconclusive, or indicate a general issue (e.g., "feels tired", "fever"), 
    you must choose "General Medicine".
    
    Patient Symptoms / Summary:
    "{symptoms_text}"
    
    Choose EXACTLY ONE from this list (do not add any other text or punctuation):
    {', '.join(VALID_SPECIALTIES)}
    """
    
    try:
        completion = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a clinical routing assistant. Respond ONLY with the name of the specialty."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,
            max_tokens=20
        )
        
        response_text = completion.choices[0].message.content.strip()
        
        # Clean up response (sometimes LLMs add quotes or periods)
        response_text = response_text.replace('"', '').replace('.', '').strip()
        
        # Match case-insensitively to valid specialties
        for valid_specialty in VALID_SPECIALTIES:
            if valid_specialty.lower() == response_text.lower():
                return valid_specialty
                
        # If it returned something outside the list, default to General Medicine
        logger.warning(f"Groq returned unknown specialty '{response_text}'. Defaulting to General Medicine.")
        return "General Medicine"
        
    except Exception as e:
        logger.error(f"Error determining specialty with Groq: {e}")
        return "General Medicine"

async def assign_referral_to_specialist(db, symptoms_text: str, hospital_id: str, override_specialty: str = None, client_type: str = "web") -> dict:
    """
    Determines the required specialty, finds eligible active doctors in the hospital,
    and assigns the referral to the one with the least workload.
    
    Returns a dictionary with:
        - success: bool
        - required_specialty: str
        - assigned_doctor_id: str (if success)
        - assigned_doctor_name: str (if success)
        - error_message: str (if not success)
    """
    if override_specialty:
        specialty = override_specialty
    else:
        specialty = await determine_referral_speciality(symptoms_text, client_type)
    
    # Resolve hospital by name or id
    hospital_query = {"$or": [{"name": hospital_id}]}
    from bson import ObjectId
    if len(hospital_id) == 24:
        try:
            hospital_query["$or"].append({"_id": ObjectId(hospital_id)})
        except:
            pass
    
    hospital = await db.hospitals.find_one(hospital_query)
    if not hospital:
        # Fallback if hospital not found (though routes should validate this earlier)
        target_hospital_name = hospital_id
    else:
        target_hospital_name = hospital.get("name")
    
    # Find all active doctors in this hospital with this specialty
    # Using 'speciality' to match the database schema in models/user.py
    doctors_cursor = db.users.find({
        "role": "doctor",
        "hospital": target_hospital_name,
        "speciality": specialty
    })
    doctors = await doctors_cursor.to_list(100)
    
    if not doctors:
        return {
            "success": False,
            "required_specialty": specialty,
            "error_message": f"No {specialty} specialist is currently available at this hospital. Please choose another hospital or refer the patient to another healthcare facility."
        }
    
    # Assign based on least workload
    # Workload = count of visits assigned to them in 'in_queue' status
    best_doctor = None
    min_workload = float('inf')
    
    for doc in doctors:
        workload = await db.visits.count_documents({
            "assigned_doctor_id": str(doc["_id"]),
            "status": "in_queue"
        })
        if workload < min_workload:
            min_workload = workload
            best_doctor = doc
            
    return {
        "success": True,
        "required_specialty": specialty,
        "assigned_doctor_id": str(best_doctor["_id"]),
        "assigned_doctor_name": best_doctor.get("name", "Doctor")
    }
