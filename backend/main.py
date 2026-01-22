from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import geopandas as gpd
import json
from pathlib import Path
from shapely.geometry import LineString
import requests
from typing import List, Tuple
from fastapi.encoders import jsonable_encoder
from datetime import datetime
import json
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import joblib
import os
import numpy as np
import requests
import time
from hotspots import HOTSPOTS
from wards import WARDS, LANDMARKS
from crowdsource import generate_crowdsource_reports
from preparedness import calculate_ward_preparedness

# Import complaint and notification modules
from complaints import ComplaintCreate, ComplaintUpdate, ComplaintRating, ComplaintStatus
from complaints_db import (
    file_complaint, assign_complaint, update_complaint_status,
    add_timeline_entry, resolve_complaint, rate_complaint,
    get_complaints_by_user, get_complaints_by_ward, track_complaint,
    get_all_complaints, get_complaint_by_id
)
from notifications import create_ward_broadcast, get_user_notifications, get_ward_notifications
from models import UserModel, NotificationModel
from admin import get_admin_dashboard_stats, get_recent_complaints

# app = FastAPI(title="FloodWatch Delhi API")

app = FastAPI(title="Delhi Water-logging API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAPBOX_TOKEN = "pk.eyJ1IjoicHNoMjAwNSIsImEiOiJjbWs2bHBzc3IwMnF3M2RzZGEwZGZnMTc5In0.2bLusixeqW_cy9oLbRbNAw"
DATA_DIR = Path("./east_delhi_data")

# Global variables
grid_data = None
wards_data = None
drains_data = None
grid_gdf = None

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



@app.on_event("startup")
async def load_geojson_data():
    global grid_data, wards_data, drains_data, grid_gdf
    print("Loading GeoJSON files...")
    
    # Load grid with risk
    grid_gdf = gpd.read_file(DATA_DIR / "grid_with_risk.geojson")
    grid_data = json.loads(grid_gdf.to_json())
    
    # Load wards
    wards_gdf = gpd.read_file(DATA_DIR / "wards_with_risk.geojson")
    wards_data = json.loads(wards_gdf.to_json())
    
    # Load drains (if exists)
    drain_file = DATA_DIR / "east_drains.geojson"
    if drain_file.exists():
        drains_gdf = gpd.read_file(drain_file)
        drains_data = json.loads(drains_gdf.to_json())
    
    print(f"✓ Loaded {len(grid_gdf)} grid cells")
    print(f"✓ Loaded {len(wards_gdf)} wards")
    print("✓ Data ready to serve")


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

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Then in your create_complaint endpoint, wrap the response:
@app.post("/api/complaints")
async def create_complaint(
    complaint: ComplaintCreate, 
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """File a new complaint"""
    try:
        effective_user_id = user_id or "anonymous-user"
        result = file_complaint(complaint, effective_user_id)
        
        # Convert any datetime objects to ISO strings
        result = jsonable_encoder(result)
        
        return JSONResponse(status_code=201, content=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.get("/api/complaints")
async def list_complaints(
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    role: Optional[str] = Header(None, alias="X-User-Role"),
    ward_number: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    """Get complaints - filtered by role"""
    try:
        if role == "ward_admin" and ward_number:
            complaints = get_complaints_by_ward(ward_number)
        elif user_id:
            complaints = get_complaints_by_user(user_id)
        else:
            complaints = get_all_complaints(ward_number=ward_number, status=status)
        
        return {"complaints": complaints, "count": len(complaints)}
    except Exception as e:
        error_msg = str(e)
        if "ServerSelectionTimeoutError" in error_msg or "connection" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Database connection failed. Please ensure MongoDB is running or check your MONGODB_URI in .env file."
            )
        raise HTTPException(status_code=500, detail=f"Error fetching complaints: {error_msg}")

@app.get("/api/complaints/{complaint_id}")
async def get_complaint(complaint_id: str):
    """Get complaint details"""
    complaint = track_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@app.get("/api/complaints/track/{complaint_id}")
async def track_complaint_public(complaint_id: str):
    """Public complaint tracking"""
    complaint = track_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@app.put("/api/complaints/{complaint_id}/assign")
async def assign_complaint_endpoint(
    complaint_id: str,
    officer_id: str = Header(..., alias="X-Officer-ID"),
    assigned_by: str = Header(..., alias="X-User-ID")
):
    """Assign complaint to officer"""
    try:
        result = assign_complaint(complaint_id, officer_id, assigned_by)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/complaints/{complaint_id}/status")
async def update_status_endpoint(
    complaint_id: str,
    update: ComplaintUpdate,
    updated_by: str = Header(..., alias="X-User-ID")
):
    """Update complaint status"""
    try:
        if update.status:
            result = update_complaint_status(
                complaint_id, 
                update.status, 
                update.remarks or "Status updated",
                updated_by
            )
        else:
            raise HTTPException(status_code=400, detail="Status is required")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/complaints/{complaint_id}/timeline")
async def add_timeline_endpoint(
    complaint_id: str,
    entry: dict,
    updated_by: str = Header(..., alias="X-User-ID")
):
    """Add timeline entry"""
    try:
        entry["updated_by"] = updated_by
        result = add_timeline_entry(complaint_id, entry)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/complaints/{complaint_id}/resolve")
async def resolve_complaint_endpoint(
    complaint_id: str,
    resolution_data: dict,
    resolved_by: str = Header(..., alias="X-User-ID")
):
    """Resolve complaint"""
    try:
        resolution = resolution_data.get("resolution", "")
        if not resolution:
            raise HTTPException(status_code=400, detail="Resolution is required")
        result = resolve_complaint(complaint_id, resolution, resolved_by)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/complaints/{complaint_id}/rate")
async def rate_complaint_endpoint(
    complaint_id: str,
    rating_data: ComplaintRating,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Rate a complaint"""
    try:
        result = rate_complaint(
            complaint_id, 
            rating_data.rating, 
            rating_data.feedback,
            user_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/complaints/user/{user_id}")
async def get_user_complaints(user_id: str):
    """Get complaints by user"""
    complaints = get_complaints_by_user(user_id)
    return {"complaints": complaints, "count": len(complaints)}

@app.get("/api/complaints/ward/{ward_number}")
async def get_ward_complaints(ward_number: int):
    """Get complaints by ward"""
    complaints = get_complaints_by_ward(ward_number)
    return {"complaints": complaints, "count": len(complaints)}

@app.post("/api/notifications/broadcast")
async def broadcast_notification(
    notification_data: dict,
    broadcast_by: str = Header(..., alias="X-User-ID")
):
    """Create ward-wide broadcast notification"""
    try:
        ward_number = notification_data.get("ward_number")
        title = notification_data.get("title")
        message = notification_data.get("message")
        notification_id = create_ward_broadcast(ward_number, title, message, broadcast_by)
        return {"success": True, "notification_id": notification_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/notifications")
async def get_notifications(
    user_id: str = Header(..., alias="X-User-ID"),
    unread_only: bool = Query(False)
):
    """Get notifications for user"""
    try:
        notifications = get_user_notifications(user_id, unread_only)
        return {"notifications": notifications, "count": len(notifications)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/notifications/ward/{ward_number}")
async def get_ward_notifications_endpoint(ward_number: int):
    """Get ward broadcast notifications"""
    try:
        notifications = get_ward_notifications(ward_number)
        return {"notifications": notifications, "count": len(notifications)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Mark notification as read"""
    try:
        success = NotificationModel.mark_as_read(notification_id)
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/notifications/read-all")
async def mark_all_notifications_read(
    user_id: str = Header(..., alias="X-User-ID")
):
    """Mark all notifications as read for user"""
    try:
        count = NotificationModel.mark_all_as_read(user_id)
        return {"success": True, "marked_count": count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
@app.post("/api/users/register")
async def register_user(
    user_data: dict,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Register or update user"""
    try:
        user_data["user_id"] = user_id
        user_id_db = UserModel.create_or_update(user_data)
        return {"success": True, "user_id": user_id_db}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/users/me")
async def get_current_user(
    user_id: str = Header(..., alias="X-User-ID")
):
    """Get current user data"""
    try:
        user = UserModel.find_by_id(user_id)
        if not user:
            UserModel.create_or_update({"user_id": user_id})
            user = UserModel.find_by_id(user_id)
        
        if user:
            if "created_at" in user and isinstance(user["created_at"], datetime):
                user["created_at"] = user["created_at"].isoformat()
            if "updated_at" in user and isinstance(user["updated_at"], datetime):
                user["updated_at"] = user["updated_at"].isoformat()
        
        return user or {}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/users/push-token")
async def register_push_token(
    token_data: dict,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Register push notification token"""
    try:
        push_token = token_data.get("push_token")
        platform = token_data.get("platform")
        success = UserModel.update_push_token(user_id, push_token, platform)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# ADMIN API ENDPOINTS
# ============================================================================

@app.get("/api/admin/dashboard")
async def get_admin_dashboard(
    ward_number: Optional[int] = Query(None),
    role: str = Header(..., alias="X-User-Role"),
    user_id: str = Header(..., alias="X-User-ID")
):
    """Get admin dashboard statistics"""
    if role not in ["ward_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        if role == "ward_admin" and not ward_number:
            user = UserModel.find_by_id(user_id)
            if user and user.get("ward_number"):
                ward_number = user.get("ward_number")
        
        stats = get_admin_dashboard_stats(ward_number)
        recent_complaints = get_recent_complaints(ward_number, limit=10)
        
        return {
            "stats": stats,
            "recent_complaints": recent_complaints
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/admin/broadcast")
async def admin_broadcast(
    broadcast_data: dict,
    user_id: str = Header(..., alias="X-User-ID"),
    role: str = Header(..., alias="X-User-Role")
):
    """Admin broadcast notification to ward"""
    print(f"[Admin Broadcast] Received request from user_id: {user_id}, role: {role}")
    print(f"[Admin Broadcast] Request data: {broadcast_data}")
    
    if role not in ["ward_admin", "admin"]:
        print(f"[Admin Broadcast] ERROR: Access denied - Invalid role: {role}")
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        ward_number = broadcast_data.get("ward_number")
        title = broadcast_data.get("title")
        message = broadcast_data.get("message")
        
        print(f"[Admin Broadcast] Ward: {ward_number}, Title: {title}")
        
        if role == "ward_admin":
            print(f"[Admin Broadcast] Checking ward_admin permissions...")
            user = UserModel.find_by_id(user_id)
            print(f"[Admin Broadcast] User from DB: {user}")
            if user:
                user_ward = user.get("ward_number")
                print(f"[Admin Broadcast] User ward: {user_ward}, Request ward: {ward_number}")
                if user_ward != ward_number:
                    print(f"[Admin Broadcast] ERROR: Ward mismatch - User ward: {user_ward}, Request ward: {ward_number}")
                    raise HTTPException(status_code=403, detail="Can only broadcast to your assigned ward")
            else:
                print(f"[Admin Broadcast] WARNING: User not found in DB, allowing request")
        
        print(f"[Admin Broadcast] Creating ward broadcast...")
        create_ward_broadcast(ward_number, title, message, user_id)
        print(f"[Admin Broadcast] SUCCESS: Notification created successfully!")
        return {"success": True}
    except HTTPException as he:
        print(f"[Admin Broadcast] HTTPException: {he.detail}")
        raise
    except Exception as e:
        print(f"[Admin Broadcast] ERROR: Exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

def check_route_risk(route_geometry: List[Tuple[float, float]]) -> dict:
    """Calculate risk score for a route"""
    if grid_gdf is None or len(route_geometry) == 0:
        return {"avg_risk": 0, "risk_segments": []}
    
    # Create route line
    route_line = LineString([(lon, lat) for lon, lat in route_geometry])
    route_buffer = route_line.buffer(0.001)  # ~100m buffer
    
    # Find intersecting cells
    intersecting = grid_gdf[grid_gdf.geometry.intersects(route_buffer)]
    
    if len(intersecting) == 0:
        return {"avg_risk": 0, "risk_segments": []}
    
    total_risk = 0
    risk_segments = []
    
    for idx, cell in intersecting.iterrows():
        risk = cell['risk_score']
        if risk > 0.5:  # High risk threshold
            risk_segments.append({
                'lat': float(cell['center_lat']),
                'lon': float(cell['center_lon']),
                'risk': float(risk),
                'category': str(cell['risk_category'])
            })
        total_risk += risk
    
    avg_risk = total_risk / len(intersecting)
    
    return {
        "avg_risk": float(avg_risk),
        "risk_segments": risk_segments
    }

@app.get("/")
async def root():
    return {
        "message": "Delhi Water-logging Risk API",
        "endpoints": {
            "grid": "/api/grid",
            "wards": "/api/wards",
            "drains": "/api/drains",
            "stats": "/api/stats",
            "high-risk": "/api/high-risk",
            "route": "/api/route",
            "alternatives": "/api/route/alternatives"
        }
    }

@app.get("/api/route")
async def get_route(
    start_lat: float = Query(..., description="Start latitude"),
    start_lon: float = Query(..., description="Start longitude"),
    end_lat: float = Query(..., description="End latitude"),
    end_lon: float = Query(..., description="End longitude"),
    profile: str = Query("driving", description="Travel mode: driving, walking, cycling")
):
    """Get route from Mapbox with water-logging risk analysis"""
    if MAPBOX_TOKEN == "YOUR_MAPBOX_TOKEN_HERE":
        raise HTTPException(
            status_code=500,
            detail="Mapbox token not configured on server"
        )
    
    # Validate profile
    if profile not in ['driving', 'walking', 'cycling']:
        profile = 'driving'
    
    # Build Mapbox request
    waypoints = f"{start_lon},{start_lat};{end_lon},{end_lat}"
    url = f"https://api.mapbox.com/directions/v5/mapbox/{profile}/{waypoints}"
    
    params = {
        'access_token': MAPBOX_TOKEN,
        'geometries': 'geojson',
        'overview': 'full',
        'steps': 'true'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Mapbox API error: {response.text}"
            )
        
        data = response.json()
        
        if 'routes' not in data or len(data['routes']) == 0:
            raise HTTPException(
                status_code=404,
                detail="No routes found between these points"
            )
        
        route = data['routes'][0]
        geometry = route['geometry']['coordinates']
        
        # Analyze water-logging risk
        risk_analysis = check_route_risk(geometry)
        avg_risk = risk_analysis['avg_risk']
        
        # Determine risk level
        if avg_risk < 0.3:
            risk_level = 'LOW - Safe to travel'
            color = '#2ecc71'
        elif avg_risk < 0.5:
            risk_level = 'MEDIUM - Caution advised'
            color = '#f1c40f'
        elif avg_risk < 0.7:
            risk_level = 'HIGH - Avoid if possible'
            color = '#e67e22'
        else:
            risk_level = 'CRITICAL - Do not travel'
            color = '#e74c3c'
        
        return {
            "route": {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": geometry
                },
                "properties": {
                    "distance_km": route['distance'] / 1000,
                    "duration_min": route['duration'] / 60,
                    "profile": profile
                }
            },
            "risk_analysis": {
                "avg_risk": avg_risk,
                "risk_level": risk_level,
                "color": color,
                "high_risk_segments": risk_analysis['risk_segments'],
                "warning_count": len(risk_analysis['risk_segments'])
            },
            "waypoints": {
                "start": {"lat": start_lat, "lon": start_lon},
                "end": {"lat": end_lat, "lon": end_lon}
            }
        }
    
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch route: {str(e)}"
        )

@app.get("/api/route/alternatives")
async def get_alternative_routes(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    profile: str = "driving"
):
    """Get multiple alternative routes and compare their risk levels"""
    waypoints = f"{start_lon},{start_lat};{end_lon},{end_lat}"
    url = f"https://api.mapbox.com/directions/v5/mapbox/{profile}/{waypoints}"
    
    params = {
        'access_token': MAPBOX_TOKEN,
        'geometries': 'geojson',
        'overview': 'full',
        'alternatives': 'true',
        'steps': 'true'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if 'routes' not in data:
            raise HTTPException(status_code=404, detail="No routes found")
        
        routes = []
        for idx, route in enumerate(data['routes']):
            geometry = route['geometry']['coordinates']
            risk_analysis = check_route_risk(geometry)
            avg_risk = risk_analysis['avg_risk']
            
            routes.append({
                "route_id": idx,
                "geometry": geometry,
                "distance_km": route['distance'] / 1000,
                "duration_min": route['duration'] / 60,
                "avg_risk": avg_risk,
                "risk_segments": risk_analysis['risk_segments'],
                "color": '#2ecc71' if avg_risk < 0.3 else '#f1c40f' if avg_risk < 0.5 else '#e67e22' if avg_risk < 0.7 else '#e74c3c'
            })
        
        # Sort by risk (safest first)
        routes.sort(key=lambda x: x['avg_risk'])
        
        return {
            "routes": routes,
            "safest_route_id": routes[0]['route_id'] if routes else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/grid")
async def get_grid_data(
    limit: int = Query(None, description="Limit number of cells"),
    risk_min: float = Query(0.0, description="Minimum risk score"),
    risk_max: float = Query(1.0, description="Maximum risk score")
):
    """Get grid cells with optional filtering"""
    if grid_data is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Data not loaded yet"}
        )
    
    # Filter by risk score
    features = grid_data["features"]
    filtered_features = [
        f for f in features
        if risk_min <= f["properties"].get("risk_score", 0) <= risk_max
    ]
    
    # Apply limit if specified
    if limit:
        filtered_features = filtered_features[:limit]
    
    return {
        "type": "FeatureCollection",
        "features": filtered_features,
        "metadata": {
            "total": len(filtered_features),
            "filtered": len(filtered_features) < len(features)
        }
    }

@app.get("/api/wards")
async def get_wards_data():
    """Get ward boundaries with aggregated risk"""
    if wards_data is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Data not loaded yet"}
        )
    return wards_data

@app.get("/api/drains")
async def get_drains_data():
    """Get drainage network"""
    if drains_data is None:
        return {"type": "FeatureCollection", "features": []}
    return drains_data

@app.get("/api/stats")
async def get_statistics():
    """Get summary statistics"""
    if grid_data is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Data not loaded yet"}
        )
    
    features = grid_data["features"]
    risk_scores = [f["properties"].get("risk_score", 0) for f in features]
    risk_categories = [f["properties"].get("risk_category", "Unknown") for f in features]
    
    # Count by category
    category_counts = {}
    for cat in risk_categories:
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    return {
        "total_cells": len(features),
        "avg_risk": sum(risk_scores) / len(risk_scores) if risk_scores else 0,
        "max_risk": max(risk_scores) if risk_scores else 0,
        "min_risk": min(risk_scores) if risk_scores else 0,
        "risk_distribution": category_counts,
        "high_risk_count": sum(1 for score in risk_scores if score > 0.7),
        "critical_count": sum(1 for score in risk_scores if score > 0.85)
    }

@app.get("/api/high-risk")
async def get_high_risk_areas(threshold: float = Query(0.7)):
    """Get only high-risk cells"""
    if grid_data is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Data not loaded yet"}
        )
    
    high_risk_features = [
        f for f in grid_data["features"]
        if f["properties"].get("risk_score", 0) >= threshold
    ]
    
    return {
        "type": "FeatureCollection",
        "features": high_risk_features,
        "metadata": {
            "threshold": threshold,
            "count": len(high_risk_features)
        }
    }

@app.get("/api/ward/{ward_id}")
async def get_ward_detail(ward_id: int):
    """Get details for specific ward"""
    if grid_data is None or wards_data is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Data not loaded yet"}
        )
    
    # Find ward
    ward = next(
        (f for f in wards_data["features"]
         if f["properties"].get("ward_id") == ward_id),
        None
    )
    
    if not ward:
        return JSONResponse(
            status_code=404,
            content={"error": f"Ward {ward_id} not found"}
        )
    
    # Get cells in this ward
    ward_cells = [
        f for f in grid_data["features"]
        if f["properties"].get("ward_id") == ward_id
    ]
    
    return {
        "ward": ward,
        "cells": {
            "type": "FeatureCollection",
            "features": ward_cells
        },
        "stats": {
            "total_cells": len(ward_cells),
            "high_risk_cells": sum(
                1 for c in ward_cells
                if c["properties"].get("risk_score", 0) > 0.7
            )
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)