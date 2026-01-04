import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

def train_model():
    np.random.seed(42)
    n_samples = 1000
    
    rainfall = np.random.uniform(0, 200, n_samples)
    elevation = np.random.uniform(200, 225, n_samples)
    drainage_score = np.random.uniform(1.0, 4.0, n_samples)
    
    risk_labels = []
    for r, e, d in zip(rainfall, elevation, drainage_score):
        if r < 30 and e > 215 and d > 3.0:
            risk_labels.append(0)
        elif r > 100 or (r > 60 and (e < 210 or d < 2.5)):
            risk_labels.append(2)
        else:
            risk_labels.append(1)
    
    X = pd.DataFrame({
        'rainfall_intensity': rainfall,
        'elevation': elevation,
        'drainage_score': drainage_score
    })
    y = np.array(risk_labels)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    model.fit(X, y)
    
    model_path = 'flood_model.pkl'
    joblib.dump(model, model_path)
    print(f"Model trained and saved to {model_path}")
    
    return model

if __name__ == "__main__":
    train_model()
