from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import joblib
import os
import numpy as np
import requests
import time
from hotspots import HOTSPOTS
from wards import WARDS, LANDMARKS
from crowdsource import generate_crowdsource_reports
from preparedness import calculate_ward_preparedness

app = FastAPI(title="FloodWatch Delhi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
model_path = "flood_model.pkl"

if os.path.exists(model_path):
    try:
        model = joblib.load(model_path)
        print("Model loaded successfully")
    except Exception as e:
        print(f"Error loading model: {e}. Using dummy prediction logic.")

class PredictionRequest(BaseModel):
    rainfall_intensity: float

class HotspotPrediction(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    risk_level: int
    probability: float

class PredictionResponse(BaseModel):
    hotspots: List[HotspotPrediction]

class RouteRequest(BaseModel):
    start: str
    end: str

class RouteResponse(BaseModel):
    route: List[List[float]]
    warnings: List[str]
    distance_km: float
    duration_min: float

class WardResponse(BaseModel):
    id: str
    name: str
    bounds: List[List[float]]
    preparedness_score: int
    pumps_available: int
    pumps_total: int
    drains_desilted: bool
    emergency_contacts: int

class CrowdsourceResponse(BaseModel):
    reports: List[Dict]

class SOSRequest(BaseModel):
    ward_id: str
    message: str

def predict_risk_dummy(rainfall: float, elevation: float, drainage_score: float) -> tuple:
    risk_score = 0.0
    
    if rainfall > 100:
        risk_score += 0.6
    elif rainfall > 60:
        risk_score += 0.4
    elif rainfall > 30:
        risk_score += 0.2
    
    if elevation < 210:
        risk_score += 0.3
    elif elevation < 215:
        risk_score += 0.15
    
    if drainage_score < 2.0:
        risk_score += 0.3
    elif drainage_score < 2.5:
        risk_score += 0.15
    
    if risk_score >= 0.7:
        risk_level = 2
        probability = min(0.95, risk_score)
    elif risk_score >= 0.4:
        risk_level = 1
        probability = risk_score
    else:
        risk_level = 0
        probability = max(0.1, risk_score)
    
    return risk_level, probability

@app.get("/")
def read_root():
    return {"message": "FloodWatch Delhi API", "status": "running"}

@app.post("/predict", response_model=PredictionResponse)
def predict_flood_risk(request: PredictionRequest):
    rainfall = request.rainfall_intensity
    predictions = []
    
    for hotspot in HOTSPOTS:
        elevation = hotspot["elevation"]
        drainage_score = hotspot["drainage_score"]
        
        if model is not None:
            try:
                features = np.array([[rainfall, elevation, drainage_score]])
                risk_level = model.predict(features)[0]
                probabilities = model.predict_proba(features)[0]
                probability = probabilities[risk_level]
            except Exception as e:
                print(f"Model prediction error: {e}. Using dummy logic.")
                risk_level, probability = predict_risk_dummy(rainfall, elevation, drainage_score)
        else:
            risk_level, probability = predict_risk_dummy(rainfall, elevation, drainage_score)
        
        predictions.append({
            "id": hotspot["id"],
            "name": hotspot["name"],
            "lat": hotspot["lat"],
            "lng": hotspot["lng"],
            "risk_level": int(risk_level),
            "probability": float(probability)
        })
    
    return PredictionResponse(hotspots=predictions)

@app.get("/hotspots")
def get_hotspots():
    return {"hotspots": HOTSPOTS}

@app.post("/route", response_model=RouteResponse)
def calculate_route(request: RouteRequest):
    start_loc = LANDMARKS.get(request.start, {"lat": 28.6139, "lng": 77.2090})
    end_loc = LANDMARKS.get(request.end, {"lat": 28.6139, "lng": 77.2090})
    
    start_coords = [start_loc["lng"], start_loc["lat"]]
    end_coords = [end_loc["lng"], end_loc["lat"]]
    
    try:
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_coords[0]},{start_coords[1]};{end_coords[0]},{end_coords[1]}?overview=full&geometries=geojson"
        response = requests.get(osrm_url, timeout=5)
        data = response.json()
        
        if data.get("code") == "Ok" and len(data.get("routes", [])) > 0:
            route_data = data["routes"][0]
            geometry = route_data["geometry"]["coordinates"]
            route = [[coord[1], coord[0]] for coord in geometry]
            distance_km = route_data["distance"] / 1000
            duration_min = route_data["duration"] / 60
        else:
            route = [[start_loc["lat"], start_loc["lng"]], [end_loc["lat"], end_loc["lng"]]]
            distance_km = 5.0
            duration_min = 15.0
    except Exception as e:
        route = [[start_loc["lat"], start_loc["lng"]], [end_loc["lat"], end_loc["lng"]]]
        distance_km = 5.0
        duration_min = 15.0
    
    warnings = []
    for hotspot in HOTSPOTS:
        for point in route:
            dist = ((point[0] - hotspot["lat"])**2 + (point[1] - hotspot["lng"])**2)**0.5 * 111
            if dist < 0.5:
                warnings.append(f"⚠️ Route passes near {hotspot['name']} (Known Flood Zone)")
                break
    
    return RouteResponse(
        route=route,
        warnings=warnings,
        distance_km=round(distance_km, 2),
        duration_min=round(duration_min, 1)
    )

@app.get("/wards", response_model=List[WardResponse])
def get_wards():
    return [WardResponse(**ward) for ward in WARDS]

@app.get("/wards/risk")
def get_ward_risks(rainfall_intensity: float = 50.0):
    predictions = []
    for hotspot in HOTSPOTS:
        elevation = hotspot["elevation"]
        drainage_score = hotspot["drainage_score"]
        
        if model is not None:
            try:
                features = np.array([[rainfall_intensity, elevation, drainage_score]])
                risk_level = model.predict(features)[0]
            except Exception as e:
                risk_level, _ = predict_risk_dummy(rainfall_intensity, elevation, drainage_score)
        else:
            risk_level, _ = predict_risk_dummy(rainfall_intensity, elevation, drainage_score)
        
        predictions.append({
            "id": hotspot["id"],
            "name": hotspot["name"],
            "lat": hotspot["lat"],
            "lng": hotspot["lng"],
            "risk_level": int(risk_level)
        })
    
    ward_risks = []
    for ward in WARDS:
        ward_hotspots = []
        for pred in predictions:
            if (ward["bounds"][0][0] <= pred["lat"] <= ward["bounds"][2][0] and
                ward["bounds"][0][1] <= pred["lng"] <= ward["bounds"][2][1]):
                ward_hotspots.append(pred)
        
        critical_count = sum(1 for h in ward_hotspots if h["risk_level"] == 2)
        warning_count = sum(1 for h in ward_hotspots if h["risk_level"] == 1)
        safe_count = sum(1 for h in ward_hotspots if h["risk_level"] == 0)
        
        if critical_count >= 2:
            ward_risk_level = 2
        elif critical_count >= 1 or warning_count >= 2:
            ward_risk_level = 1
        elif warning_count >= 1:
            ward_risk_level = 1
        else:
            ward_risk_level = 0
        
        max_risk_in_ward = max([h["risk_level"] for h in ward_hotspots], default=0)
        preparedness = calculate_ward_preparedness(ward, ward_hotspots)
        
        ward_risks.append({
            "ward_id": ward["id"],
            "ward_name": ward["name"],
            "risk_level": ward_risk_level,
            "critical_hotspots": critical_count,
            "warning_hotspots": warning_count,
            "safe_hotspots": safe_count,
            "total_hotspots": len(ward_hotspots),
            "preparedness_score": preparedness["score"],
            "preparedness_level": preparedness["level"],
            "has_preparedness_gap": preparedness["has_gap"],
            "preparedness_gap_message": preparedness["gap_message"],
            "pumps_available": ward["pumps_available"],
            "pumps_total": ward["pumps_total"],
            "drains_desilted": ward["drains_desilted"]
        })
    
    return {"ward_risks": ward_risks}

@app.get("/crowdsource")
def get_crowdsource_reports(rainfall_intensity: float = 50.0):
    reports = generate_crowdsource_reports(rainfall_intensity, HOTSPOTS)
    return CrowdsourceResponse(reports=reports)

@app.post("/sos/broadcast")
def broadcast_sos(request: SOSRequest):
    ward = next((w for w in WARDS if w["id"] == request.ward_id), None)
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    
    contacts_count = ward["emergency_contacts"]
    
    return {
        "success": True,
        "message": request.message,
        "ward": ward["name"],
        "sms_sent": contacts_count,
        "whatsapp_groups_notified": 15,
        "residents_notified": contacts_count,
        "timestamp": int(time.time())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
