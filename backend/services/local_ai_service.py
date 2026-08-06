import os
import joblib
import pandas as pd
import numpy as np
import time
from datetime import datetime
from transformers import pipeline
import torch

class LocalAIService:
    def __init__(self):
        print("Initializing Local AI Service...")
        self.models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models_bin')
        
        # Load Disease Prediction Models
        try:
            self.disease_model = joblib.load(os.path.join(self.models_dir, 'disease_model.pkl'))
            self.disease_encoder = joblib.load(os.path.join(self.models_dir, 'disease_label_encoder.pkl'))
            self.disease_features = joblib.load(os.path.join(self.models_dir, 'disease_features.pkl'))
            self.disease_map = joblib.load(os.path.join(self.models_dir, 'disease_specialty_map.pkl'))
        except Exception as e:
            print(f"Warning: Disease models not fully loaded. Run training script. {e}")
            self.disease_model = None
            
        # Load Referral Models
        try:
            self.referral_model = joblib.load(os.path.join(self.models_dir, 'referral_model.pkl'))
            self.referral_encoder = joblib.load(os.path.join(self.models_dir, 'referral_label_encoder.pkl'))
            self.referral_vectorizer = joblib.load(os.path.join(self.models_dir, 'referral_vectorizer.pkl'))
        except Exception as e:
            print(f"Warning: Referral models not fully loaded. Run training script. {e}")
            self.referral_model = None

        # Evaluation & Deployment Selection
        # 1. Speech Recognition: Whisper-Tiny vs Whisper-Base
        # tiny: ~150MB RAM, fast. base: ~300MB RAM, slower.
        # Best balance for mobile backend without GPU is 'openai/whisper-tiny'
        print("Loading Speech Recognition Pipeline (whisper-tiny)...")
        try:
            self.stt_pipeline = pipeline("automatic-speech-recognition", model="openai/whisper-tiny")
        except Exception as e:
            print(f"Error loading STT: {e}")
            self.stt_pipeline = None

        # 2. Summarization: FLAN-T5-Small vs DistilBART vs BART-Base
        # flan-t5-small: ~300MB RAM, great instruction following. distilbart: ~1.2GB RAM. bart-base: ~500MB RAM.
        # Best balance for latency & memory is 'google/flan-t5-small'
        print("Loading Summarization Pipeline (flan-t5-small)...")
        try:
            self.summarization_pipeline = pipeline("summarization", model="google/flan-t5-small")
        except Exception as e:
            print(f"Error loading Summarizer: {e}")
            self.summarization_pipeline = None

    def log_prediction(self, task, result_dict, confidence):
        # requirement: Store every AI prediction together with model version, confidence, timestamp, prediction result
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "task": task,
            "model_version": "v1.0-local",
            "confidence": round(confidence, 4) if isinstance(confidence, float) else confidence,
            "prediction": result_dict
        }
        log_path = os.path.join(os.path.dirname(__file__), '../ai_predictions_log.jsonl')
        with open(log_path, 'a') as f:
            f.write(json.dumps(log_entry) + "\n")

    def transcribe_audio(self, audio_path: str) -> str:
        if not self.stt_pipeline:
            return "Transcription model unavailable."
        
        result = self.stt_pipeline(audio_path)
        return result["text"].strip()

    def summarize_text(self, text: str) -> str:
        if not self.summarization_pipeline:
            return "Summarization model unavailable."
            
        # T5 limits
        input_text = text[:1500] 
        result = self.summarization_pipeline(input_text, max_length=150, min_length=30, do_sample=False)
        return result[0]["summary_text"]

    def predict_disease(self, symptoms_list: list) -> dict:
        if not self.disease_model:
            return {"error": "Model not loaded"}
            
        # Create input array based on trained features
        input_vector = np.zeros(len(self.disease_features))
        
        # Very simple symptom matching
        symptoms_str = " ".join(symptoms_list).lower()
        for idx, feature in enumerate(self.disease_features):
            if feature.lower().replace('_', ' ') in symptoms_str:
                input_vector[idx] = 1
                
        # Predict
        proba = self.disease_model.predict_proba([input_vector])[0]
        max_idx = np.argmax(proba)
        disease_class = max_idx
        confidence = float(proba[max_idx])
        disease_name = self.disease_encoder.inverse_transform([disease_class])[0]
        
        # Map metadata
        mapped_data = self.disease_map.get(disease_name, ("General Medicine", "Unknown"))
        specialty = mapped_data[0]
        severity = mapped_data[1]
        
        result = {
            "predicted_disease": disease_name,
            "confidence": confidence,
            "severity": severity,
            "recommended_specialty": specialty,
            "risk_level": "High" if severity in ["High", "Critical"] else "Moderate" if severity == "Medium" else "Low",
            "recommended_referral": f"Refer to {specialty} immediately" if severity in ["High", "Critical"] else f"Monitor or refer to {specialty}"
        }
        
        self.log_prediction("disease_prediction", result, confidence)
        return result

    def predict_referral(self, clinical_text: str) -> dict:
        if not self.referral_model:
            return {"error": "Referral model not loaded"}
            
        # Vectorize
        X_test = self.referral_vectorizer.transform([clinical_text]).toarray()
        
        # Predict
        proba = self.referral_model.predict_proba(X_test)[0]
        max_idx = np.argmax(proba)
        confidence = float(proba[max_idx])
        specialty = self.referral_encoder.inverse_transform([max_idx])[0]
        
        priority = "High" if confidence < 0.5 or "severe" in clinical_text.lower() else "Routine"
        
        result = {
            "recommended_specialty": specialty,
            "confidence": confidence,
            "referral_priority": priority,
            "short_explanation": f"Based on symptoms, {specialty} is strongly indicated." if confidence > 0.7 else f"Initial evaluation suggests {specialty}, pending further assessment."
        }
        
        self.log_prediction("referral_prediction", result, confidence)
        return result

    def generate_clinical_insights(self, clinical_text: str) -> dict:
        # Generate structured clinical insights using both models
        
        # Attempt to extract some symptoms from text manually to pass to disease model
        words = clinical_text.lower().split()
        
        disease_res = self.predict_disease(words)
        referral_res = self.predict_referral(clinical_text)
        
        disease_name = disease_res.get("predicted_disease", "Unknown")
        risk_level = disease_res.get("risk_level", "Unknown")
        dept = referral_res.get("recommended_specialty", disease_res.get("recommended_specialty", "General"))
        
        result = {
            "Disease": disease_name,
            "Risk Level": risk_level,
            "Suggested Department": dept,
            "Suggested Tests": "Complete Blood Count, Vitals Assessment" if risk_level in ["High", "Critical"] else "Routine Vitals",
            "Follow-up Advice": "Immediate specialist consultation recommended." if risk_level in ["High", "Critical"] else "Monitor for 48 hours.",
            "Referral Recommendation": referral_res.get("short_explanation", "Referral based on clinical guidelines.")
        }
        
        self.log_prediction("clinical_insights", result, disease_res.get("confidence", 0.0))
        return result

local_ai = LocalAIService()
