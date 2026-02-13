from fastapi import APIRouter, Query
from fastapi import HTTPException
from safe_parking_recommendation import find_best_parking
from typing import Optional, List
from safe_parking_data import SAFE_PARKING_LOCATIONS
import math


router = APIRouter(prefix="/api/safe-parking", tags=["Safe Parking"])

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

@router.get("")
async def get_safe_parking(
    lat: float = Query(..., description="Latitude of current location"),
    lon: float = Query(..., description="Longitude of current location"),
    radius: int = Query(4000, description="Search radius in meters (default 2km)"),
    limit: int = Query(4, description="Maximum number of results")
):
    """Find nearest safe parking locations within radius"""
    
    # Calculate distance for each parking location
    parking_with_distance = []
    for parking in SAFE_PARKING_LOCATIONS:
        distance = calculate_distance(lat, lon, parking["lat"], parking["lon"])
        
        if distance <= radius:
            parking_with_distance.append({
                **parking,
                "distance_m": round(distance),
                "distance_km": round(distance / 1000, 1)
            })
    
    # Sort by distance
    parking_with_distance.sort(key=lambda x: x["distance_m"])
    
    # Limit results
    results = parking_with_distance[:limit]
    
    return {
        "count": len(results),
        "locations": results,
        "search_params": {
            "lat": lat,
            "lon": lon,
            "radius_m": radius
        }
    }

@router.get("/all")
async def get_all_parking():
    """Get all safe parking locations"""
    return {
        "count": len(SAFE_PARKING_LOCATIONS),
        "locations": SAFE_PARKING_LOCATIONS
    }

@router.get("/recommended")
async def get_recommended_parking(
    lat: float,
    lon: float,
    radius: int = 4000,
    limit: int = 4
):
    result = find_best_parking(lat, lon, radius, limit)

    # Always return 200 with array
    return {
        "count": len(result) if result else 0,
        "locations": result if result else []
    }
