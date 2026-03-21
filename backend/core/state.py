from typing import Optional, Dict, Any
import joblib
import geopandas as gpd
import json
import os
import osmnx as ox
import redis as redis_lib          # ← ADD THIS LINE
from .config import DATA_DIR, MODEL_PATH

class AppState:
    grid_data: Optional[Dict[str, Any]] = None
    wards_data: Optional[Dict[str, Any]] = None
    drains_data: Optional[Dict[str, Any]] = None
    grid_gdf: Optional[gpd.GeoDataFrame] = None
    model: Any = None
    road_graph: Any = None
    safe_parking_gdf: Optional[gpd.GeoDataFrame] = None
    redis: Any = None              # ← ADD THIS LINE

    @classmethod
    def load_data(cls):
        print("Loading GeoJSON files...")
        
        cls.grid_gdf = gpd.read_file(DATA_DIR / "grid_with_risk.geojson")
        cls.grid_data = json.loads(cls.grid_gdf.to_json())
        
        wards_gdf = gpd.read_file(DATA_DIR / "wards_with_risk.geojson")
        cls.wards_data = json.loads(wards_gdf.to_json())
        
        drain_file = DATA_DIR / "east_drains.geojson"
        if drain_file.exists():
            drains_gdf = gpd.read_file(drain_file)
            cls.drains_data = json.loads(drains_gdf.to_json())
        
        print(f"✓ Loaded {len(cls.grid_gdf)} grid cells")
        print(f"✓ Loaded {len(wards_gdf)} wards")

        if os.path.exists(MODEL_PATH):
            try:
                cls.model = joblib.load(MODEL_PATH)
                print("Model loaded successfully")
            except Exception as e:
                print(f"Error loading model: {e}. Using dummy prediction logic.")
        else:
            print(f"Model file not found at {MODEL_PATH}. Using dummy logic.")
        
        try:
            print("Loading Delhi road network (OSM)...")
            cls.road_graph = ox.graph_from_place("Delhi, India", network_type="drive")

            print("Loading safe parking GeoJSON...")
            parking_path = DATA_DIR / "delhi_parking_safe_recommended.geojson"
            if parking_path.exists():
                cls.safe_parking_gdf = gpd.read_file(parking_path)
                cls.safe_parking_gdf = cls.safe_parking_gdf[
                    cls.safe_parking_gdf["risk_category"].str.lower().isin(["low", "moderate"])
                ]
                print(f"✓ Loaded {len(cls.safe_parking_gdf)} safe parking locations")
            else:
                print("Safe parking GeoJSON not found")
        except Exception as e:
            print(f"Error loading safe parking resources: {e}")

        # ── ADD THIS ENTIRE BLOCK at the end of load_data ──────────────────
        try:
            cls.redis = redis_lib.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6380)),   # 6380 = your Docker Redis
                password=os.getenv("REDIS_PASSWORD") or None,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2,
            )
            cls.redis.ping()
            print("✓ Redis connected")
        except Exception as e:
            print(f"⚠ Redis not available ({e}) — caching disabled, app still works")
            cls.redis = None
        # ───────────────────────────────────────────────────────────────────

        print("✓ Data ready to serve")

state = AppState()