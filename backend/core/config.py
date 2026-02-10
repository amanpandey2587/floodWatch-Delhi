import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "east_delhi_data"

# Keys
# MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "pk.eyJ1IjoicHNoMjAwNSIsImEiOiJjbWs2bHBzc3IwMnF3M2RzZGEwZGZnMTc5In0.2bLusixeqW_cy9oLbRbNAw")
MAPBOX_TOKEN = "pk.eyJ1IjoicHNoMjAwNSIsImEiOiJjbWs2bHBzc3IwMnF3M2RzZGEwZGZnMTc5In0.2bLusixeqW_cy9oLbRbNAw"

# Model
MODEL_PATH = BASE_DIR / "flood_model.pkl"
