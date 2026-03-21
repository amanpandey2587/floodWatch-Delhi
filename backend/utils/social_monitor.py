from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import os
import json
import time
import requests
from pathlib import Path
from core.config import DATA_DIR

# In-memory cache for monitoring results
_monitor_state: Dict[str, Any] = {
    "last_run": None,
    "data": None,
    "data_source": "mock"
}

_ward_polygons: Optional[List[Dict[str, Any]]] = None
_geocode_cache: Dict[str, Dict[str, Any]] = {}

_MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")
_GEO_CACHE_PATH = os.getenv("SOCIAL_GEO_CACHE_PATH", str(Path(__file__).resolve().parent / "social_geocode_cache.json"))

_LOCATION_KEYWORDS = [
    "near", "at", "in", "around", "beside", "outside", "inside",
    "sector", "block", "market", "metro", "station", "road", "rd",
    "street", "st", "junction", "crossing", "underpass", "flyover",
    "bridge", "hospital", "school", "college", "gate", "park",
    "circle", "chowk", "chauk", "lane", "colony", "area", "zone",
    "society", "tower", "phase", "ward"
]

def _load_geocode_cache() -> None:
    global _geocode_cache
    try:
        if Path(_GEO_CACHE_PATH).exists():
            with open(_GEO_CACHE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    _geocode_cache = data
    except Exception as e:
        print(f"[Social] Failed to load geocode cache: {e}")
        _geocode_cache = {}

def _save_geocode_cache() -> None:
    try:
        with open(_GEO_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(_geocode_cache, f)
    except Exception as e:
        print(f"[Social] Failed to save geocode cache: {e}")

def _cleanup_geocode_cache(max_age_seconds: int = 86400) -> None:
    now = time.time()
    to_delete = []
    for key, entry in _geocode_cache.items():
        ts = entry.get("ts", 0)
        if now - ts > max_age_seconds:
            to_delete.append(key)
    for key in to_delete:
        _geocode_cache.pop(key, None)
    if to_delete:
        _save_geocode_cache()

_load_geocode_cache()

def _load_ward_polygons() -> List[Dict[str, Any]]:
    global _ward_polygons
    if _ward_polygons is not None:
        return _ward_polygons

    default_geojson = DATA_DIR / "wards_with_risk.geojson"
    geojson_path = os.getenv("WARDS_GEOJSON_PATH", str(default_geojson))

    try:
        with open(geojson_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[Social] Failed to load wards geojson: {e}")
        _ward_polygons = []
        return _ward_polygons

    wards: List[Dict[str, Any]] = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        ward_name = props.get("ward_name") or props.get("WARD_NAME") or props.get("name") or "UNKNOWN"
        ward_id = props.get("ward_id") or props.get("WARD_ID") or props.get("id")
        if geom.get("type") == "Polygon":
            coords = geom.get("coordinates", [])
            wards.append({
                "ward_name": ward_name,
                "ward_id": ward_id,
                "polygons": coords
            })
        elif geom.get("type") == "MultiPolygon":
            coords = geom.get("coordinates", [])
            wards.append({
                "ward_name": ward_name,
                "ward_id": ward_id,
                "polygons": coords
            })
    _ward_polygons = wards
    return wards

def _point_in_ring(point: Tuple[float, float], ring: List[List[float]]) -> bool:
    x, y = point
    inside = False
    n = len(ring)
    if n < 3:
        return False
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        intersects = ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1)
        if intersects:
            inside = not inside
    return inside

def _point_in_polygon(lat: float, lon: float, polygons: List[List[List[float]]]) -> bool:
    # polygons is list of rings; first ring is outer, others holes
    for poly in polygons:
        if not poly:
            continue
        outer = poly[0]
        if _point_in_ring((lon, lat), outer):
            # If in outer ring, ensure not in any hole
            holes = poly[1:] if len(poly) > 1 else []
            if any(_point_in_ring((lon, lat), hole) for hole in holes):
                return False
            return True
    return False

def _ward_for_point(lat: float, lon: float) -> Optional[str]:
    wards = _load_ward_polygons()
    for ward in wards:
        polygons = ward.get("polygons") or []
        if _point_in_polygon(lat, lon, polygons):
            return ward.get("ward_name") or ward.get("ward_id")
    return None

def _centroid_for_ward(ward_name: str) -> Optional[Tuple[float, float]]:
    wards = _load_ward_polygons()
    for ward in wards:
        if ward.get("ward_name") == ward_name:
            polygons = ward.get("polygons") or []
            # Use first ring of first polygon for centroid approx
            if polygons and polygons[0]:
                ring = polygons[0][0]
                if not ring:
                    return None
                lons = [p[0] for p in ring]
                lats = [p[1] for p in ring]
                return (sum(lats) / len(lats), sum(lons) / len(lons))
    return None

def _has_api_keys() -> bool:
    return any([
        os.getenv("SOCIAL_TWITTER_BEARER_TOKEN"),
        os.getenv("SOCIAL_REDDIT_CLIENT_ID"),
        os.getenv("SOCIAL_REDDIT_CLIENT_SECRET"),
        os.getenv("SOCIAL_YOUTUBE_API_KEY"),
    ])

def _build_mock_posts(hours_back: int = 24) -> List[Dict[str, Any]]:
    now = datetime.now()
    posts = [
        {
            "platform": "twitter",
            "text": "Severe waterlogging near Laxmi Nagar metro entrance. Traffic stuck.",
            "ward": "WARD_005",
            "urgency": 0.82,
            "sentiment": -0.6,
            "timestamp": (now - timedelta(minutes=35)).isoformat()
        },
        {
            "platform": "twitter",
            "text": "Underpass at Karol Bagh is flooded again. Avoid the route.",
            "ward": "WARD_001",
            "urgency": 0.74,
            "sentiment": -0.4,
            "timestamp": (now - timedelta(hours=1, minutes=10)).isoformat()
        },
        {
            "platform": "reddit",
            "text": "Civil Lines main road has ankle deep water. Movement slow.",
            "ward": "WARD_002",
            "urgency": 0.55,
            "sentiment": -0.2,
            "timestamp": (now - timedelta(hours=2)).isoformat()
        },
        {
            "platform": "twitter",
            "text": "Dwarka Sector 10 waterlogging cleared, traffic improving.",
            "ward": "WARD_004",
            "urgency": 0.25,
            "sentiment": 0.3,
            "timestamp": (now - timedelta(hours=3, minutes=20)).isoformat()
        },
        {
            "platform": "twitter",
            "text": "Connaught Place inner circle flooded near gate 3.",
            "ward": "WARD_003",
            "urgency": 0.68,
            "sentiment": -0.5,
            "timestamp": (now - timedelta(hours=4, minutes=5)).isoformat()
        },
        {
            "platform": "reddit",
            "text": "Rohini sector 16 puddles forming after rain. Still passable.",
            "ward": "WARD_006",
            "urgency": 0.32,
            "sentiment": -0.1,
            "timestamp": (now - timedelta(hours=5, minutes=30)).isoformat()
        },
    ]

    # Add approximate coordinates based on ward centroid if possible
    for post in posts:
        ward_name = post.get("ward")
        if ward_name:
            centroid = _centroid_for_ward(ward_name)
            if centroid:
                post["location"] = {"lat": centroid[0], "lon": centroid[1]}
    return posts

def _extract_ward_from_text(text: str) -> Optional[str]:
    if not text:
        return None
    lower = text.lower()
    # Simple heuristic for explicit ward mentions
    if "ward" in lower:
        for token in lower.replace("_", " ").split():
            if token.isdigit():
                return f"WARD_{int(token):03d}"
    return None

def _resolve_post_ward(post: Dict[str, Any]) -> Optional[str]:
    # Prefer explicit ward
    if post.get("ward"):
        return post.get("ward")
    # Use coordinates if present
    loc = post.get("location") or {}
    lat = loc.get("lat")
    lon = loc.get("lon")
    if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
        return _ward_for_point(lat, lon)
    # Heuristic from text
    ward_from_text = _extract_ward_from_text(post.get("text", ""))
    if ward_from_text:
        return ward_from_text
    # Mapbox geocoding from free-text location (only if location keywords exist)
    if _MAPBOX_TOKEN and _text_has_location_keywords(post.get("text", "")):
        geocoded = _geocode_text_to_location(post.get("text", ""))
        if geocoded:
            post["location"] = geocoded
            return _ward_for_point(geocoded["lat"], geocoded["lon"])
    return None

def _text_has_location_keywords(text: str) -> bool:
    if not text:
        return False
    lower = text.lower()
    return any(kw in lower for kw in _LOCATION_KEYWORDS)

def _geocode_text_to_location(text: str) -> Optional[Dict[str, float]]:
    if not text:
        return None
    key = text.strip().lower()
    _cleanup_geocode_cache()
    if key in _geocode_cache:
        cached = _geocode_cache[key]
        if time.time() - cached.get("ts", 0) < 3600:
            return cached.get("location")
    if not _MAPBOX_TOKEN:
        return None
    try:
        url = "https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json".format(
            requests.utils.quote(text)
        )
        params = {
            "access_token": _MAPBOX_TOKEN,
            "limit": 1,
            "proximity": "77.1025,28.7041",  # Delhi center to bias results
            "types": "place,locality,neighborhood,address"
        }
        resp = requests.get(url, params=params, timeout=5)
        if resp.status_code != 200:
            return None
        data = resp.json()
        features = data.get("features", [])
        if not features:
            return None
        center = features[0].get("center")
        if not center or len(center) < 2:
            return None
        location = {"lon": float(center[0]), "lat": float(center[1])}
        _geocode_cache[key] = {"location": location, "ts": time.time()}
        _save_geocode_cache()
        return location
    except Exception:
        return None

def _aggregate_posts(posts: List[Dict[str, Any]]) -> Dict[str, Any]:
    ward_stats: Dict[str, Dict[str, Any]] = {}
    for post in posts:
        ward = _resolve_post_ward(post) or "UNKNOWN"
        post["ward"] = ward
        stats = ward_stats.setdefault(ward, {
            "mention_count": 0,
            "avg_urgency": 0.0,
            "avg_sentiment": 0.0,
            "risk_spike": 0.0
        })
        stats["mention_count"] += 1
        stats["avg_urgency"] += float(post.get("urgency", 0.0))
        stats["avg_sentiment"] += float(post.get("sentiment", 0.0))

    for ward, stats in ward_stats.items():
        count = max(1, stats["mention_count"])
        stats["avg_urgency"] = round(stats["avg_urgency"] / count, 2)
        stats["avg_sentiment"] = round(stats["avg_sentiment"] / count, 2)
        # Simple spike heuristic: urgency weighted + mention volume
        stats["risk_spike"] = round(min(1.0, stats["avg_urgency"] * 0.7 + min(1.0, count / 10.0) * 0.3), 2)

    return ward_stats

def _build_monitoring_data(hours_back: int = 24) -> Dict[str, Any]:
    posts = _build_mock_posts(hours_back)
    ward_analysis = _aggregate_posts(posts)
    return {
        "timestamp": datetime.now().isoformat(),
        "total_posts": len(posts),
        "ward_analysis": ward_analysis,
        "recent_posts": posts
    }

def start_monitoring(hours_back: int = 24) -> Dict[str, Any]:
    has_keys = _has_api_keys()
    data_source = "api" if has_keys else "mock"

    # Placeholder for real API pipeline. For now, use mock data even if keys exist.
    data = _build_monitoring_data(hours_back)

    _monitor_state["last_run"] = datetime.now().isoformat()
    _monitor_state["data"] = data
    _monitor_state["data_source"] = data_source

    return {
        "status": "started",
        "message": "Monitoring started",
        "data_source": data_source
    }

def get_status() -> Dict[str, Any]:
    if not _monitor_state["data"]:
        # Initialize with mock data so panel can show something
        _monitor_state["data"] = _build_monitoring_data(24)
        _monitor_state["last_run"] = datetime.now().isoformat()
        _monitor_state["data_source"] = "mock"

    return {
        "status": "success",
        "data": _monitor_state["data"],
        "data_source": _monitor_state["data_source"],
        "last_run": _monitor_state["last_run"]
    }
