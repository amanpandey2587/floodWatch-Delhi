from fastapi import HTTPException
import numpy as np
import requests
import time
import os
from core.state import state
from core.config import MAPBOX_TOKEN
from hotspots import HOTSPOTS
from wards import WARDS, LANDMARKS
from crowdsource import generate_crowdsource_reports
from preparedness import calculate_ward_preparedness
from shapely.geometry import LineString

class MapController:
    @staticmethod
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

    @staticmethod
    def predict_flood_risk(rainfall_intensity: float):
        predictions = []
        
        for hotspot in HOTSPOTS:
            elevation = hotspot["elevation"]
            drainage_score = hotspot["drainage_score"]
            
            if state.model is not None:
                try:
                    features = np.array([[rainfall_intensity, elevation, drainage_score]])
                    risk_level = state.model.predict(features)[0]
                    probabilities = state.model.predict_proba(features)[0]
                    probability = probabilities[risk_level]
                except Exception as e:
                    print(f"Model prediction error: {e}. Using dummy logic.")
                    risk_level, probability = MapController.predict_risk_dummy(rainfall_intensity, elevation, drainage_score)
            else:
                risk_level, probability = MapController.predict_risk_dummy(rainfall_intensity, elevation, drainage_score)
            
            predictions.append({
                "id": hotspot["id"],
                "name": hotspot["name"],
                "lat": hotspot["lat"],
                "lng": hotspot["lng"],
                "risk_level": int(risk_level),
                "probability": float(probability)
            })
        
        return {"hotspots": predictions}

    @staticmethod
    def get_hotspots():
        return {"hotspots": HOTSPOTS}

    @staticmethod
    def calculate_route(start: str, end: str):
        start_loc = LANDMARKS.get(start, {"lat": 28.6139, "lng": 77.2090})
        end_loc = LANDMARKS.get(end, {"lat": 28.6139, "lng": 77.2090})
        
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
        
        return {
            "route": route,
            "warnings": warnings,
            "distance_km": round(distance_km, 2),
            "duration_min": round(duration_min, 1)
        }

    @staticmethod
    def get_wards():
        return [ward for ward in WARDS]

    @staticmethod
    def get_ward_risks(rainfall_intensity: float):
        predictions = []
        for hotspot in HOTSPOTS:
            elevation = hotspot["elevation"]
            drainage_score = hotspot["drainage_score"]
            
            if state.model is not None:
                try:
                    features = np.array([[rainfall_intensity, elevation, drainage_score]])
                    risk_level = state.model.predict(features)[0]
                except Exception as e:
                    risk_level, _ = MapController.predict_risk_dummy(rainfall_intensity, elevation, drainage_score)
            else:
                risk_level, _ = MapController.predict_risk_dummy(rainfall_intensity, elevation, drainage_score)
            
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

    @staticmethod
    def get_crowdsource_reports(rainfall_intensity: float):
        reports = generate_crowdsource_reports(rainfall_intensity, HOTSPOTS)
        return {"reports": reports}

    @staticmethod
    def check_route_risk(route_geometry):
        if state.grid_gdf is None or len(route_geometry) == 0:
            return {"avg_risk": 0, "risk_segments": []}
        
        # Create route line
        try:
            route_line = LineString([(lon, lat) for lon, lat in route_geometry])
            route_buffer = route_line.buffer(0.001)  # ~100m buffer
        except Exception:
             # Fallback if geometry is invalid
             return {"avg_risk": 0, "risk_segments": []}
        
        # Find intersecting cells
        intersecting = state.grid_gdf[state.grid_gdf.geometry.intersects(route_buffer)]
        
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

    @staticmethod
    def get_mapbox_route(start_lat, start_lon, end_lat, end_lon, profile):
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
                    detail="No route found"
                )
            
            route = data['routes'][0]
            geometry = route['geometry']['coordinates']
            
            # Analyze risk for this route
            risk_analysis = MapController.check_route_risk(geometry)
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
                status_code=503,
                detail=f"Error contacting routing service: {str(e)}"
            )

    @staticmethod
    def broadcast_sos(ward_id: str, message: str):
        ward = next((w for w in WARDS if w["id"] == ward_id), None)
        if not ward:
            raise HTTPException(status_code=404, detail="Ward not found")
        
        contacts_count = ward["emergency_contacts"]
        
        return {
            "success": True,
            "message": message,
            "ward": ward["name"],
            "sms_sent": contacts_count,
            "whatsapp_groups_notified": 15,
            "residents_notified": contacts_count,
            "timestamp": int(time.time())
        }

    @staticmethod
    def get_grid_data(limit: int = None, risk_min: float = 0.0, risk_max: float = 1.0):
        if state.grid_data is None:
            raise HTTPException(status_code=503, detail="Data not loaded yet")
        
        # Filter by risk score
        features = state.grid_data["features"]
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

    @staticmethod
    def get_drains_data():
        if state.drains_data is None:
            return {"type": "FeatureCollection", "features": []}
        return state.drains_data

    @staticmethod
    def get_statistics():
        if state.grid_data is None:
            raise HTTPException(status_code=503, detail="Data not loaded yet")
        
        features = state.grid_data["features"]
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

    @staticmethod
    def get_high_risk_areas(threshold: float):
        if state.grid_data is None:
            raise HTTPException(status_code=503, detail="Data not loaded yet")
        
        high_risk_features = [
            f for f in state.grid_data["features"]
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

    @staticmethod
    def get_ward_detail(ward_id: int):
        if state.grid_data is None or state.wards_data is None:
            raise HTTPException(status_code=503, detail="Data not loaded yet")
        
        # Find ward
        ward = next(
            (f for f in state.wards_data["features"]
             if f["properties"].get("ward_id") == ward_id),
            None
        )
        
        if not ward:
            raise HTTPException(status_code=404, detail=f"Ward {ward_id} not found")
        
        # Get cells in this ward
        ward_cells = [
            f for f in state.grid_data["features"]
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

    @staticmethod
    def get_alternative_routes(start_lat, start_lon, end_lat, end_lon, profile):
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
                risk_analysis = MapController.check_route_risk(geometry)
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

    @staticmethod
    def geocode(query: str):
        if MAPBOX_TOKEN == "YOUR_MAPBOX_TOKEN_HERE":
            raise HTTPException(
                status_code=500,
                detail="Mapbox token not configured on server"
            )
        
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"
        
        params = {
            'access_token': MAPBOX_TOKEN,
            'limit': 5,
            'country': 'in',
            'bbox': '76.8,28.4,77.3,28.9'  # Bounds for Delhi roughly
        }
        
        try:
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if 'features' not in data:
                return []
            
            results = []
            for feature in data['features']:
                results.append({
                    "name": feature['place_name'],
                    "lat": feature['center'][1],
                    "lon": feature['center'][0]
                })
                
            return results
            
        except Exception as e:
            print(f"Geocoding error: {e}")
            return []
