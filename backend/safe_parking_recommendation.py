import osmnx as ox
import networkx as nx
import pandas as pd
from core.state import state
from shapely.geometry import Point

# Risk penalty in meters
RISK_PENALTY = {
    "low": 0,
    "moderate": 2000
}

def clean_value(value):
    """Convert NaN to None for JSON compatibility"""
    if pd.isna(value):
        return None
    return value

def find_best_parking(user_lat: float, user_lon: float, radius: int = 3000, limit: int = 3):

    G = state.road_graph
    parking_gdf = state.safe_parking_gdf

    if G is None or parking_gdf is None or parking_gdf.empty:
        raise Exception("Safe parking resources not loaded")

    try:
        orig_node = ox.nearest_nodes(G, user_lon, user_lat)
    except Exception:
        return None
    
    user_point = Point(user_lon, user_lat)

    # Fast approximate distance (Euclidean)
    parking_gdf["approx_dist"] = parking_gdf.geometry.distance(user_point)

    # Filter by radius first
    nearby = parking_gdf[parking_gdf["approx_dist"] <= radius]

    if nearby.empty:
        return []

    # Take closest 10 candidates only (performance optimization)
    candidates = nearby.nsmallest(10, "approx_dist")

    orig_node = ox.nearest_nodes(G, user_lon, user_lat)

    results = []

    for _, row in candidates.iterrows():

        try:
            if row.geometry is None:
                continue

            dest_node = ox.nearest_nodes(G, row.geometry.x, row.geometry.y)

            distance = nx.shortest_path_length(
                G,
                orig_node,
                dest_node,
                weight="length"
            )

            risk = str(row.get("risk_category", "")).lower()
            penalty = RISK_PENALTY.get(risk, 0)

            total_score = distance + penalty

            path = nx.shortest_path(
                G,
                orig_node,
                dest_node,
                weight="length"
            )

            route_coords = [
                {
                    "lat": G.nodes[node]["y"],
                    "lon": G.nodes[node]["x"]
                }
                for node in path
            ]
            raw_name = row.get("name")
            if raw_name is None or str(raw_name).strip() == "" or str(raw_name).lower() == "nan":
                generated_name = f"Safe Parking ({round(row.geometry.y, 4)}, {round(row.geometry.x, 4)})"
            else:
                generated_name = raw_name   

            results.append({
                "name": generated_name,
                "lat": clean_value(row.geometry.y),
                "lon": clean_value(row.geometry.x),
                "risk": clean_value(row.get("risk_category")),
                "distance_m": clean_value(round(distance, 2)),
                "final_score": clean_value(round(total_score, 2)),
                "route": route_coords
            })

        except Exception:
            continue

    # Sort by final score
    results.sort(key=lambda x: x["final_score"])

    return results[:limit]

