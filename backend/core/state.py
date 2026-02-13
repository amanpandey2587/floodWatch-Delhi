from typing import Optional, Dict, Any
import joblib
import geopandas as gpd
import json
import os
import osmnx as ox
from .config import DATA_DIR, MODEL_PATH

class AppState:
    grid_data: Optional[Dict[str, Any]] = None
    wards_data: Optional[Dict[str, Any]] = None
    drains_data: Optional[Dict[str, Any]] = None
    grid_gdf: Optional[gpd.GeoDataFrame] = None
    model: Any = None
        # Safe Parking
    road_graph: Any = None
    safe_parking_gdf: Optional[gpd.GeoDataFrame] = None

    @classmethod
    def load_data(cls):
        print("Loading GeoJSON files...")
        
        # Load grid with risk
        cls.grid_gdf = gpd.read_file(DATA_DIR / "grid_with_risk.geojson")
        cls.grid_data = json.loads(cls.grid_gdf.to_json())
        
        # Load wards
        wards_gdf = gpd.read_file(DATA_DIR / "wards_with_risk.geojson")
        cls.wards_data = json.loads(wards_gdf.to_json())
        
        # Load drains (if exists)
        drain_file = DATA_DIR / "east_drains.geojson"
        if drain_file.exists():
            drains_gdf = gpd.read_file(drain_file)
            cls.drains_data = json.loads(drains_gdf.to_json())
        
        print(f"✓ Loaded {len(cls.grid_gdf)} grid cells")
        print(f"✓ Loaded {len(wards_gdf)} wards")

        # Load model
        if os.path.exists(MODEL_PATH):
            try:
                cls.model = joblib.load(MODEL_PATH)
                print("Model loaded successfully")
            except Exception as e:
                print(f"Error loading model: {e}. Using dummy prediction logic.")
        else:
            print(f"Model file not found at {MODEL_PATH}. Using dummy logic.")
        
        # ----------------------------
        # Load Safe Parking Resources
        # ----------------------------
        try:
            print("Loading Delhi road network (OSM)...")
            cls.road_graph = ox.graph_from_place("Delhi, India", network_type="drive")
            #cls.road_graph = ox.add_edge_lengths(cls.road_graph)

            print("Loading safe parking GeoJSON...")
            parking_path = DATA_DIR / "delhi_parking_safe_recommended.geojson"
            if parking_path.exists():
                cls.safe_parking_gdf = gpd.read_file(parking_path)

                # Keep only low + moderate
                cls.safe_parking_gdf = cls.safe_parking_gdf[
                    cls.safe_parking_gdf["risk_category"].str.lower().isin(["low", "moderate"])
                ]

                print(f"✓ Loaded {len(cls.safe_parking_gdf)} safe parking locations")
            else:
                print("Safe parking GeoJSON not found")

        except Exception as e:
            print(f"Error loading safe parking resources: {e}")

        print("✓ Data ready to serve")

state = AppState()
