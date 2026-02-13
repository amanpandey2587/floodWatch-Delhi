import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "east_delhi_data"

# Keys
MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")

# Model
MODEL_PATH = BASE_DIR / "flood_model.pkl"
