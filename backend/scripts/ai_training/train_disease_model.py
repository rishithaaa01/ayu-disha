import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import os

def create_synthetic_data(num_samples=5000):
    """
    Simulates a disease symptom dataset. 
    In a real scenario, this would load Kaggle's Disease Symptom Prediction dataset.
    """
    np.random.seed(42)
    symptoms = ['fever', 'cough', 'fatigue', 'headache', 'nausea', 'vomiting', 'diarrhea', 'muscle_pain']
    diseases = ['Flu', 'COVID-19', 'Common Cold', 'Food Poisoning', 'Malaria']
    
    data = []
    for _ in range(num_samples):
        disease = np.random.choice(diseases)
        # Create symptom profiles
        if disease == 'Flu':
            row = [np.random.binomial(1, 0.9), np.random.binomial(1, 0.8), np.random.binomial(1, 0.9), np.random.binomial(1, 0.7), 0, 0, 0, np.random.binomial(1, 0.8)]
        elif disease == 'COVID-19':
            row = [np.random.binomial(1, 0.8), np.random.binomial(1, 0.9), np.random.binomial(1, 0.9), np.random.binomial(1, 0.6), 0, 0, 0, np.random.binomial(1, 0.7)]
        elif disease == 'Common Cold':
            row = [np.random.binomial(1, 0.4), np.random.binomial(1, 0.9), np.random.binomial(1, 0.6), np.random.binomial(1, 0.5), 0, 0, 0, np.random.binomial(1, 0.3)]
        elif disease == 'Food Poisoning':
            row = [np.random.binomial(1, 0.3), 0, np.random.binomial(1, 0.8), np.random.binomial(1, 0.4), np.random.binomial(1, 0.9), np.random.binomial(1, 0.9), np.random.binomial(1, 0.9), np.random.binomial(1, 0.6)]
        else: # Malaria
            row = [np.random.binomial(1, 0.95), np.random.binomial(1, 0.3), np.random.binomial(1, 0.9), np.random.binomial(1, 0.9), np.random.binomial(1, 0.7), np.random.binomial(1, 0.6), np.random.binomial(1, 0.4), np.random.binomial(1, 0.9)]
        
        row.append(disease)
        data.append(row)
        
    cols = symptoms + ['disease']
    return pd.DataFrame(data, columns=cols)

def train_and_evaluate():
    print("Loading dataset...")
    df = create_synthetic_data()
    
    X = df.drop('disease', axis=1)
    y = df['disease']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    print("\n--- Model Evaluation ---")
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred, average='weighted'):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred, average='weighted'):.4f}")
    print(f"F1-Score:  {f1_score(y_test, y_pred, average='weighted'):.4f}")
    
    # Save the model
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/disease_prediction_rf.pkl')
    print("\nModel saved to models/disease_prediction_rf.pkl")

if __name__ == '__main__':
    train_and_evaluate()
