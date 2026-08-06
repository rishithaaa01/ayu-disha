from fastapi import APIRouter, File, UploadFile, Form
import joblib
import pandas as pd

router = APIRouter()

# Load Trained Models (Simulated path, assume they are accessible)
try:
    disease_model = joblib.load('scripts/ai_training/models/disease_prediction_rf.pkl')
    referral_model = joblib.load('scripts/ai_training/models/referral_classification_gb.pkl')
except:
    disease_model = None
    referral_model = None

@router.post("/predict-disease")
async def predict_disease(symptoms: list[int]):
    if not disease_model:
        return {"error": "Model not loaded", "prediction": "Flu"}
    
    # Needs exactly 8 features as per our script
    if len(symptoms) != 8:
        return {"error": "Expected 8 symptom features"}
        
    pred = disease_model.predict([symptoms])[0]
    return {"prediction": str(pred)}

@router.post("/classify-referral")
async def classify_referral(age: int, severity: int, vital_risk: float, chronic: int, duration: int):
    if not referral_model:
        return {"error": "Model not loaded", "referral_needed": 1}
        
    df = pd.DataFrame([{
        'age': age,
        'severity_score': severity,
        'vital_risk': vital_risk,
        'chronic_conditions': chronic,
        'symptom_duration_days': duration
    }])
    pred = referral_model.predict(df)[0]
    return {"referral_needed": int(pred)}

# Simulated Local Open-Source AI (Transformers / Whisper)
# In a real environment, we'd use:
# from transformers import pipeline
# summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

@router.post("/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    # Simulating whisper locally running
    # result = whisper_model.transcribe(file)
    return {"text": "This is a simulated local Whisper speech-to-text transcription for React Native."}

@router.post("/summarize-pdf")
async def summarize_pdf(text: str = Form(...)):
    # Simulating local summarization model
    # summary = summarizer(text, max_length=130, min_length=30, do_sample=False)
    return {"summary": "This is a simulated local LLM PDF summary based on the provided text."}

@router.post("/clinical-insights")
async def clinical_insights(symptoms: str = Form(...)):
    # Simulating local LLaMA or similar small LLM
    return {"insights": f"Local AI Insight: Based on {symptoms}, consider checking vitals."}
