from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List
from controllers.map_controller import MapController
from fastapi import APIRouter, HTTPException
from core.state import state

router = APIRouter(tags=["Map & Analysis"])

# Models
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
    reports: List[dict]

class SOSRequest(BaseModel):
    ward_id: str
    message: str


# Endpoints
@router.post("/api/predict", response_model=PredictionResponse)
def predict_flood_risk(request: PredictionRequest):
    return MapController.predict_flood_risk(request.rainfall_intensity)

@router.get("/api/hotspots")
def get_hotspots():
    return MapController.get_hotspots()

@router.post("/api/route", response_model=RouteResponse)
def calculate_route(request: RouteRequest):
    return MapController.calculate_route(request.start, request.end)

@router.get("/api/wards", response_model=List[WardResponse])
def get_wards():
    return [WardResponse(**ward) for ward in MapController.get_wards()]

@router.get("/api/wards/risk")
def get_ward_risks(rainfall_intensity: float = 50.0):
    return MapController.get_ward_risks(rainfall_intensity)

@router.get("/api/crowdsource")
def get_crowdsource_reports(rainfall_intensity: float = 50.0):
    reports = MapController.get_crowdsource_reports(rainfall_intensity)["reports"]
    return CrowdsourceResponse(reports=reports)


@router.get("/api/route")
async def get_route(
    start_lat: float = Query(..., description="Start latitude"),
    start_lon: float = Query(..., description="Start longitude"),
    end_lat: float = Query(..., description="End latitude"),
    end_lon: float = Query(..., description="End longitude"),
    profile: str = Query("driving", description="Travel mode: driving, walking, cycling")
):
    """Get route from Mapbox with water-logging risk analysis"""
    return MapController.get_mapbox_route(start_lat, start_lon, end_lat, end_lon, profile)

@router.get("/api/grid")
def get_grid_data(
    limit: int = Query(None, description="Limit number of cells"),
    risk_min: float = Query(0.0, description="Minimum risk score"),
    risk_max: float = Query(1.0, description="Maximum risk score"),
    bbox_n: float = Query(None, description="Viewport north bound"),   # ← ADD
    bbox_s: float = Query(None, description="Viewport south bound"),   # ← ADD
    bbox_e: float = Query(None, description="Viewport east bound"),    # ← ADD
    bbox_w: float = Query(None, description="Viewport west bound"),
    zoom: int = Query(12)    # ← ADD
):
    return MapController.get_grid_data(
        limit, risk_min, risk_max,
        bbox_n, bbox_s, bbox_e, bbox_w ,zoom   # ← ADD these four args
    )

@router.get("/api/drains")
def get_drains_data():
    return MapController.get_drains_data()

@router.get("/api/stats")
def get_statistics():
    return MapController.get_statistics()

@router.get("/api/high-risk")
def get_high_risk_areas(threshold: float = Query(0.7)):
    return MapController.get_high_risk_areas(threshold)

@router.get("/api/geocode")
def geocode(query: str = Query(..., min_length=3)):
    return MapController.geocode(query)

@router.get("/api/ward/{ward_id}")
def get_ward_detail(ward_id: int):
    return MapController.get_ward_detail(ward_id)

@router.get("/api/route/alternatives")
def get_alternative_routes(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    profile: str = "driving"
):
    return MapController.get_alternative_routes(start_lat, start_lon, end_lat, end_lon, profile)


@router.get("/api/clusters")
def get_clusters(severity: str = None):
    return MapController.get_clusters(severity=severity)

@router.get("/api/isolated-hotspots")
def get_isolated_hotspots(risk_min: float = 0.5):
    return MapController.get_isolated_hotspots(risk_min=risk_min)

@router.post("/api/update-rainfall")
def update_rainfall(payload: dict):
    return MapController.update_rainfall(
        rainfall_mm=payload.get("rainfall_mm", 0),
        coverage_geojson=payload.get("coverage_geojson")
    )


@router.get("/api/village-boundaries")
def get_village_boundaries():
    """Returns village polygons as GeoJSON — loaded from KML at startup."""
    if state.wards_data is None:
        raise HTTPException(status_code=503, detail="Village data not loaded")
    return state.wards_data


@router.get("/api/village-preparedness")
def get_village_preparedness(level: str = None):
    """
    Returns village polygons with preparedness scores.
    Optional ?level=Critical+gap to filter by level.
    """
    if state.wards_data is None:
        raise HTTPException(status_code=503, detail="Village data not loaded")

    features = state.wards_data["features"]
    if level:
        features = [
            f for f in features
            if f["properties"].get("PREP_LEVEL", "") == level
        ]

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {"total": len(features), "level_filter": level}
    }