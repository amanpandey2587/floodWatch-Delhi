from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random

# 1. Initialize the App
app = FastAPI(title="ML Model API (Testing Mode)")

# --- MOCK MODEL START ---
# Since we don't have a real joblib file yet, we create a fake class
# that mimics how a Scikit-Learn model behaves.
class FakeModel:
    def predict(self, data):
        # 'data' comes in as a list of lists: [[f1, f2, f3...]]
        # We'll just return a random 0 or 1 to simulate a binary classification
        return [random.choice([0, 1])]

# Initialize the fake model
model = FakeModel()
print("Mock Model loaded for testing.")
# --- MOCK MODEL END ---

# 2. Define Input Schema using Pydantic
class InputFeatures(BaseModel):
    feature_1: float
    feature_2: float
    feature_3: float
    feature_4: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "feature_1": 10.5,
                "feature_2": 3.2,
                "feature_3": 0.5,
                "feature_4": 1.1
            }
        }

# 3. Define Output Schema
class PredictionOutput(BaseModel):
    prediction: int
    message: str

# 4. Create the Prediction Endpoint
@app.post("/predict", response_model=PredictionOutput)
def predict(data: InputFeatures):
    
    # Validation Check:
    # If the user sends a string instead of a float, Pydantic catches it 
    # before it even reaches this line.

    # Format data for the "model" (list of lists)
    input_data = [[
        data.feature_1,
        data.feature_2,
        data.feature_3,
        data.feature_4
    ]]
    
    # Call the Mock Model
    try:
        prediction = model.predict(input_data)[0]
        
        return {
            "prediction": prediction,
            "message": "This is a dummy result for testing."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    return {"message": "Test API is running perfectly!"}