import os
import time
from pathlib import Path
from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv
load_dotenv()
AZURE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
CONTAINER_NAME = "floodwatchcontainer"

BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "east_delhi_data"

# (blob name in Azure,                          local path)
FILES = [
    ("grid_with_risk.geojson",                  DATA_DIR / "grid_with_risk.geojson"),
    ("wards_with_risk.geojson",                 DATA_DIR / "wards_with_risk.geojson"),
    ("delhi_parking_safe_recommended.geojson",  DATA_DIR / "delhi_parking_safe_recommended.geojson"),
    ("grid_risk.pmtiles",                       DATA_DIR / "grid_risk.pmtiles"),                   
]

def download_all():
    if not AZURE_CONNECTION_STRING:
        print("⚠ AZURE_STORAGE_CONNECTION_STRING not set — skipping download")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    client    = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
    container = client.get_container_client(CONTAINER_NAME)

    for blob_name, local_path in FILES:
        if local_path.exists():
            print(f"  ✓ {blob_name} already present — skipping")
            continue

        print(f"  ↓ Downloading {blob_name}...")
        t0 = time.time()
        with open(local_path, "wb") as f:
            container.download_blob(blob_name).readinto(f)
        print(f"    done in {time.time()-t0:.1f}s")

    print("✓ All data files ready")

if __name__ == "__main__":
    download_all()