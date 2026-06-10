import requests
import json
import time

BASE_URL = "https://ayu-disha.onrender.com/api"

def print_result(name, res):
    if res.status_code == 200:
        print(f"PASS: {name}")
    else:
        print(f"FAIL: {name} ({res.status_code}) - {res.text}")

def test_all_ai_endpoints():
    print("Running AI Functionality Diagnostics on Render Backend...\n")
    
    # Create dummy WebM file
    dummy_audio = "test_audio.webm"
    with open(dummy_audio, "wb") as f:
        # Minimum valid WebM header
        f.write(b"\x1a\x45\xdf\xa3")

    # 1. ASHA Dashboard
    print("--- 1. ASHA Dashboard AI Features ---")
    
    # ASHA Transcription
    try:
        with open(dummy_audio, "rb") as f:
            files = {"file": ("voice_note.webm", f, "audio/webm")}
            res = requests.post(f"{BASE_URL}/asha/transcribe", files=files)
            # A completely invalid webm might fail Groq processing, but we check if it hits the service
            # If we get 400 Unsupported, it means the server didn't update.
            # If we get Groq error, it means the server updated!
            print(f"ASHA Transcribe Status: {res.status_code} - {res.text[:100]}")
    except Exception as e:
        print(f"ASHA Transcribe Request Error: {e}")

    # ASHA Risk Classifier
    payload = {
        "member_name": "Test Member",
        "member_age": 45,
        "member_gender": "male",
        "visit_type": "Routine Checkup",
        "observations": {"symptoms": "severe chest pain, shortness of breath, sweating"},
        "transcript": ""
    }
    try:
        res = requests.post(f"{BASE_URL}/asha/visits/classify-risk", json=payload)
        print_result("ASHA AI Risk Classifier", res)
        if res.status_code == 200:
            print("   ↳ Risk Output:", res.json().get('risk_level', 'Unknown'))
    except Exception as e:
        print(f"ASHA Classifier Error: {e}")

    # 2. Patient Dashboard
    print("\n--- 2. Patient Dashboard AI Features ---")
    
    # Patient Symptom Logger
    payload = {
        "symptoms": "fever, mild headache for 2 days"
    }
    # This endpoint likely requires auth. Let's see if it rejects auth properly (401/403 means it exists and is protected)
    try:
        res = requests.post(f"{BASE_URL}/patients/me/symptoms", json=payload)
        print(f"Patient Symptoms Endpoint Status: {res.status_code} (Expected 401 if auth required)")
    except Exception as e:
        print(f"Patient Symptoms Error: {e}")

    # Patient Voice Transcribe (Uses /voice/transcribe)
    try:
        with open(dummy_audio, "rb") as f:
            files = {"file": ("voice_note.webm", f, "audio/webm")}
            res = requests.post(f"{BASE_URL}/voice/transcribe", files=files)
            print(f"Patient/Global Transcribe Status: {res.status_code} - {res.text[:100]}")
    except Exception as e:
        print(f"Patient Transcribe Error: {e}")

    # 3. Clinician Dashboard
    print("\n--- 3. Clinician Dashboard AI Features ---")
    
    # Clinician Differential Diagnosis
    try:
        # Assuming /clinician/differential needs auth, checking response
        res = requests.get(f"{BASE_URL}/clinician/differential?symptoms=cough&patient_id=test")
        print(f"Clinician Differential Status: {res.status_code} (Expected 401 if auth required)")
    except Exception as e:
        print(f"Clinician Differential Error: {e}")

    # Cleanup
    import os
    if os.path.exists(dummy_audio):
        os.remove(dummy_audio)

if __name__ == "__main__":
    test_all_ai_endpoints()
