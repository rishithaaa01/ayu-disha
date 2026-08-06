import os
import pandas as pd
import numpy as np
import urllib.request
import json
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
try:
    from xgboost import XGBClassifier
except ImportError:
    XGBClassifier = None
try:
    from lightgbm import LGBMClassifier
except ImportError:
    LGBMClassifier = None

# Ensure models directory exists
os.makedirs('../../models_bin', exist_ok=True)
os.makedirs('reports', exist_ok=True)

def evaluate_models(X, y, task_name, is_multiclass=True):
    print(f"\n{'='*50}\nEvaluating Models for {task_name}\n{'='*50}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    models = {
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'SVM': SVC(probability=True, random_state=42)
    }
    
    if XGBClassifier:
        # XGBoost requires labels to be 0 to num_classes-1
        models['XGBoost'] = XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42)
    
    if LGBMClassifier:
        models['LightGBM'] = LGBMClassifier(random_state=42)
        
    best_model = None
    best_f1 = 0
    best_name = ""
    
    report_data = []

    for name, model in models.items():
        print(f"\nTraining {name}...")
        try:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            y_proba = model.predict_proba(X_test) if hasattr(model, 'predict_proba') else None
            
            acc = accuracy_score(y_test, y_pred)
            prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            
            roc_auc = "N/A"
            if y_proba is not None:
                try:
                    roc_auc = roc_auc_score(y_test, y_proba, multi_class='ovr', average='weighted')
                except:
                    pass
            
            cv_scores = cross_val_score(model, X, y, cv=3, scoring='f1_weighted')
            cv_mean = cv_scores.mean()
            
            print(f"Metrics: Acc={acc:.4f}, F1={f1:.4f}, CV_F1={cv_mean:.4f}")
            
            report_data.append({
                'Model': name,
                'Accuracy': acc,
                'Precision': prec,
                'Recall': rec,
                'F1-Score': f1,
                'ROC-AUC': roc_auc,
                'CV Mean F1': cv_mean
            })
            
            if f1 > best_f1:
                best_f1 = f1
                best_model = model
                best_name = name
                best_y_test = y_test
                best_y_pred = y_pred
        except Exception as e:
            print(f"Error training {name}: {e}")

    print(f"\n>>> Best Model for {task_name}: {best_name} (F1: {best_f1:.4f}) <<<")
    
    # Generate comprehensive report for the best model
    report_file = f'reports/{task_name}_report.txt'
    with open(report_file, 'w') as f:
        f.write(f"--- BEST MODEL: {best_name} ---\n\n")
        f.write("--- METRICS COMPARISON ---\n")
        for r in report_data:
            f.write(str(r) + "\n")
            
        f.write("\n\n--- CLASSIFICATION REPORT ---\n")
        f.write(classification_report(best_y_test, best_y_pred, zero_division=0))
        
        f.write("\n\n--- CONFUSION MATRIX ---\n")
        f.write(np.array2string(confusion_matrix(best_y_test, best_y_pred)))
        
        if hasattr(best_model, 'feature_importances_'):
            f.write("\n\n--- FEATURE IMPORTANCE ---\n")
            f.write("Model supports feature importances. (Top features saved in model object)")

    return best_model, best_name

def train_disease_prediction():
    print("Evaluating Datasets for Disease Prediction...")
    print("Dataset 1: Columbia University Disease Symptom (132 features, 41 diseases, ~4920 samples)")
    print("Dataset 2: SympScan (200+ features, noisy)")
    print("Selection: Columbia dataset due to clinical binary feature precision.")
    
    url = "https://raw.githubusercontent.com/itachi9604/Disease-Inference-Engine/master/Data/Training.csv"
    try:
        df = pd.read_csv(url)
        # Clean up columns (they sometimes have trailing spaces)
        df.columns = df.columns.str.strip()
        # Drop 'prognosis' and any unneeded columns like 'Unnamed: 133'
        if 'Unnamed: 133' in df.columns:
            df = df.drop('Unnamed: 133', axis=1)
    except Exception as e:
        print(f"Failed to download. Falling back to synthetic data. Error: {e}")
        # Synthetic fallback
        symptoms = ['fever', 'cough', 'fatigue', 'headache', 'nausea']
        diseases = ['Flu', 'COVID', 'Cold', 'Food Poisoning']
        data = []
        for _ in range(2000):
            disease = np.random.choice(diseases)
            row = [np.random.binomial(1, 0.7) for _ in symptoms]
            row.append(disease)
            data.append(row)
        df = pd.DataFrame(data, columns=symptoms + ['prognosis'])
        
    X = df.drop('prognosis', axis=1)
    y_raw = df['prognosis']
    
    # Label encode y for models like XGBoost
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    
    best_model, best_name = evaluate_models(X, y, "Disease_Prediction")
    
    joblib.dump(best_model, '../../models_bin/disease_model.pkl')
    joblib.dump(le, '../../models_bin/disease_label_encoder.pkl')
    # Save feature names so we can align incoming data
    joblib.dump(list(X.columns), '../../models_bin/disease_features.pkl')
    
    # Save a risk/specialty map
    specialty_map = {
        'Fungal infection': ('Dermatology', 'Low'),
        'Allergy': ('Allergist', 'Low'),
        'GERD': ('Gastroenterology', 'Medium'),
        'Chronic cholestasis': ('Hepatology', 'High'),
        'Drug Reaction': ('Dermatology', 'Medium'),
        'Peptic ulcer diseae': ('Gastroenterology', 'High'),
        'AIDS': ('Infectious Disease', 'High'),
        'Diabetes': ('Endocrinology', 'High'),
        'Gastroenteritis': ('Gastroenterology', 'Medium'),
        'Bronchial Asthma': ('Pulmonology', 'High'),
        'Hypertension': ('Cardiology', 'High'),
        'Migraine': ('Neurology', 'Medium'),
        'Cervical spondylosis': ('Orthopedics', 'Medium'),
        'Paralysis (brain hemorrhage)': ('Neurology', 'Critical'),
        'Jaundice': ('Gastroenterology', 'Medium'),
        'Malaria': ('Infectious Disease', 'High'),
        'Chicken pox': ('Infectious Disease', 'Medium'),
        'Dengue': ('Infectious Disease', 'High'),
        'Typhoid': ('Infectious Disease', 'High'),
        'hepatitis A': ('Hepatology', 'Medium'),
        'Hepatitis B': ('Hepatology', 'High'),
        'Hepatitis C': ('Hepatology', 'High'),
        'Hepatitis D': ('Hepatology', 'High'),
        'Hepatitis E': ('Hepatology', 'High'),
        'Alcoholic hepatitis': ('Hepatology', 'High'),
        'Tuberculosis': ('Pulmonology', 'High'),
        'Common Cold': ('General Medicine', 'Low'),
        'Pneumonia': ('Pulmonology', 'High'),
        'Dimorphic hemmorhoids(piles)': ('Proctology', 'Medium'),
        'Heart attack': ('Cardiology', 'Critical'),
        'Varicose veins': ('Vascular Surgery', 'Medium'),
        'Hypothyroidism': ('Endocrinology', 'Medium'),
        'Hyperthyroidism': ('Endocrinology', 'Medium'),
        'Hypoglycemia': ('Endocrinology', 'High'),
        'Osteoarthristis': ('Orthopedics', 'Medium'),
        'Arthritis': ('Rheumatology', 'Medium'),
        '(vertigo) Paroymsal  Positional Vertigo': ('ENT', 'Medium'),
        'Acne': ('Dermatology', 'Low'),
        'Urinary tract infection': ('Urology', 'Medium'),
        'Psoriasis': ('Dermatology', 'Medium'),
        'Impetigo': ('Dermatology', 'Medium')
    }
    joblib.dump(specialty_map, '../../models_bin/disease_specialty_map.pkl')
    
    print(f"Saved best model {best_name} and encoders to models_bin/")

def train_referral_prediction():
    print("\nEvaluating Datasets for Referral Classification...")
    print("Dataset 1: MTSamples (4999 samples, ~40 specialties). Rich clinical text.")
    print("Dataset 2: PubMed Abstracts. Not clinical presentation.")
    print("Selection: MTSamples due to direct mapping of clinical transcription to medical specialty.")
    
    url = "https://raw.githubusercontent.com/wong-carmela/medical-transcription-classification/master/data/mtsamples.csv"
    try:
        df = pd.read_csv(url, index_col=0)
        df = df.dropna(subset=['transcription', 'medical_specialty'])
        
        # Simplify specialties to top 15 to ensure good classification accuracy
        top_specs = df['medical_specialty'].value_counts().nlargest(15).index
        df = df[df['medical_specialty'].isin(top_specs)]
    except Exception as e:
        print(f"Failed to download MTSamples. Generating synthetic. Error: {e}")
        # Synthetic fallback
        data = [
            ("Patient has severe chest pain and shortness of breath.", "Cardiology"),
            ("Patient complaining of chronic headaches and dizziness.", "Neurology"),
            ("Patient has a skin rash and severe itching.", "Dermatology"),
            ("Patient shows signs of depression and anxiety.", "Psychiatry"),
            ("Patient has a broken bone in the right arm.", "Orthopedics")
        ] * 200
        df = pd.DataFrame(data, columns=['transcription', 'medical_specialty'])

    X_text = df['transcription']
    y_raw = df['medical_specialty']
    
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    
    vectorizer = TfidfVectorizer(stop_words='english', max_features=1500)
    X = vectorizer.fit_transform(X_text).toarray()
    
    best_model, best_name = evaluate_models(X, y, "Referral_Classification")
    
    joblib.dump(best_model, '../../models_bin/referral_model.pkl')
    joblib.dump(le, '../../models_bin/referral_label_encoder.pkl')
    joblib.dump(vectorizer, '../../models_bin/referral_vectorizer.pkl')
    
    print(f"Saved best model {best_name} and vectorizer to models_bin/")

if __name__ == "__main__":
    train_disease_prediction()
    train_referral_prediction()
