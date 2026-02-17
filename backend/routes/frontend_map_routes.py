from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from controllers.map_controller import MapController


router = APIRouter(tags=["Frontend Map Compatibility"])


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


@router.post("/predict", response_model=PredictionResponse)
def predict_flood_risk(request: PredictionRequest):
    return MapController.predict_flood_risk(request.rainfall_intensity)


@router.get("/wards")
def get_wards():
    return MapController.get_wards()


@router.get("/wards/risk")
def get_ward_risks(rainfall_intensity: float = 50.0):
    return MapController.get_ward_risks(rainfall_intensity)


@router.get("/crowdsource")
def get_crowdsource_reports(rainfall_intensity: float = 50.0):
    return MapController.get_crowdsource_reports(rainfall_intensity)


@router.post("/route")
def calculate_route(request: RouteRequest):
    return MapController.calculate_route(request.start, request.end)
