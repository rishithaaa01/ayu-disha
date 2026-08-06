import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import os

def create_synthetic_referral_data(num_samples=3000):
    """
    Simulates a dataset for Referral Classification.
    Determines if a patient should be referred to a secondary/tertiary hospital.
    Features: age, severity_score, vital_risk, chronic_conditions, symptom_duration_days
    Target: 0 (Manage Locally), 1 (Refer)
    """
    np.random.seed(42)
    
    age = np.random.randint(1, 90, num_samples)
    severity_score = np.random.randint(1, 10, num_samples)
    vital_risk = np.random.uniform(0, 1, num_samples)
    chronic_conditions = np.random.randint(0, 4, num_samples)
    symptom_duration_days = np.random.randint(1, 30, num_samples)
    
    # Logic for referral: High severity OR high vital risk OR (elderly + chronic)
    referral = np.zeros(num_samples, dtype=int)
    for i in range(num_samples):
        risk_factor = (severity_score[i] * 0.4) + (vital_risk[i] * 10 * 0.4) + (chronic_conditions[i] * 0.1) + ((age[i]/100) * 0.1)
        if risk_factor > 4.5 or vital_risk[i] > 0.85:
            referral[i] = 1
            
    df = pd.DataFrame({
        'age': age,
        'severity_score': severity_score,
        'vital_risk': vital_risk,
        'chronic_conditions': chronic_conditions,
        'symptom_duration_days': symptom_duration_days,
        'referral_needed': referral
    })
    return df

def train_and_evaluate():
    print("Loading referral dataset...")
    df = create_synthetic_referral_data()
    
    X = df.drop('referral_needed', axis=1)
    y = df['referral_needed']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Gradient Boosting Classifier...")
    model = GradientBoostingClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    print("\n--- Referral Model Evaluation ---")
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"F1-Score:  {f1_score(y_test, y_pred):.4f}")
    
    # Save the model
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/referral_classification_gb.pkl')
    print("\nModel saved to models/referral_classification_gb.pkl")

if __name__ == '__main__':
    train_and_evaluate()
