from typing import Optional, Dict, Any
import geopandas as gpd
import json, os, time
import osmnx as ox
import redis as redis_lib
from sqlalchemy import create_engine, text
import joblib
from .config import DATA_DIR, MODEL_PATH

DATABASE_URL = os.getenv(
    "POSTGRESQL_CONNECTION_STRING",
    "postgresql://user:pass@yourserver.postgres.database.azure.com:5432/floodwatch?sslmode=require"
)

class AppState:
    grid_data:        Optional[Dict[str, Any]] = None
    wards_data:       Optional[Dict[str, Any]] = None
    drains_data:      Optional[Dict[str, Any]] = None
    clusters_data:    Optional[Dict[str, Any]] = None   # ← was missing
    grid_gdf:         Optional[gpd.GeoDataFrame] = None
    model:            Any = None
    road_graph:       Any = None
    safe_parking_gdf: Optional[gpd.GeoDataFrame] = None
    redis:            Any = None
    db_engine:        Any = None

    @classmethod
    def load_data(cls):

        # ── 1. DB connection (writes + cluster queries only) ──────────────────
        print("Connecting to PostgreSQL...")
        try:
            cls.db_engine = create_engine(
                DATABASE_URL,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
                pool_recycle=300,
                connect_args={"sslmode": "require"}
            )
            with cls.db_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("✓ PostgreSQL connected")
        except Exception as e:
            print(f"⚠ PostgreSQL not available ({e}) — DB features disabled")
            cls.db_engine = None

        # ── 2. Grid — load from FILE not DB (fast: 2-4s vs 15-45s) ───────────
        t0 = time.time()
        print("Loading grid cells from file...")
        try:
            cls.grid_gdf = gpd.read_file(DATA_DIR / "grid_with_risk.geojson")

            if "center_lat" not in cls.grid_gdf.columns:
                centroids = cls.grid_gdf.geometry.centroid
                cls.grid_gdf["center_lat"] = centroids.y
                cls.grid_gdf["center_lon"] = centroids.x

            cls.grid_data = json.loads(cls.grid_gdf.to_json())
            print(f"✓ {len(cls.grid_gdf):,} grid cells loaded in {time.time()-t0:.1f}s")
        except Exception as e:
            print(f"✗ Grid file load failed: {e}")

        # ── 3. Wards — load from FILE (preserves correct column names) ────────
        # wards_with_risk.geojson already has VILLAGE/TEHSIL/DISTRICT uppercase
        # loading from the DB villages table gives lowercase — frontend breaks
        print("Loading wards...")
    
        #     wards_gdf      = gpd.read_file(DATA_DIR / "wards_with_risk.geojson")
        #     cls.wards_data = json.loads(wards_gdf.to_json())
        #     print(f"✓ {len(wards_gdf)} wards loaded")
        # except FileNotFoundError:
        #     print("  wards_with_risk.geojson not found — trying DB fallback...")
        cls._load_villages_from_db()

        # ── 4. Clusters — load from DB (small: ~500 rows, fast) ───────────────
        cls._load_clusters_from_db()

        # ── 5. Drains — file only ─────────────────────────────────────────────
        drain_file = DATA_DIR / "east_drains.geojson"
        if drain_file.exists():
            drains_gdf      = gpd.read_file(drain_file)
            cls.drains_data = json.loads(drains_gdf.to_json())
            print(f"✓ {len(drains_gdf)} drain features loaded")

        # ── 6. ML model ───────────────────────────────────────────────────────
        if os.path.exists(MODEL_PATH):
            try:
                cls.model = joblib.load(MODEL_PATH)
                print("✓ Model loaded")
            except Exception as e:
                print(f"⚠ Model load failed: {e}")
        else:
            print("⚠ Model not found — using dummy prediction")

        # ── 7. Road graph + parking ───────────────────────────────────────────
        try:
            print("Loading Delhi road network...")
            cls.road_graph = ox.graph_from_place("Delhi, India", network_type="drive")
            parking_path = DATA_DIR / "delhi_parking_safe_recommended.geojson"
            if parking_path.exists():
                cls.safe_parking_gdf = gpd.read_file(parking_path)
                cls.safe_parking_gdf = cls.safe_parking_gdf[
                    cls.safe_parking_gdf["risk_category"]
                    .str.lower().isin(["low", "moderate"])
                ]
                print(f"✓ {len(cls.safe_parking_gdf)} safe parking locations loaded")
        except Exception as e:
            print(f"⚠ Road/parking load failed: {e}")

        # ── 8. Redis ──────────────────────────────────────────────────────────
        try:
            cls.redis = redis_lib.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6380)),
                password=os.getenv("REDIS_PASSWORD") or None,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2,
            )
            cls.redis.ping()
            print("✓ Redis connected")
        except Exception as e:
            print(f"⚠ Redis not available ({e}) — caching disabled")
            cls.redis = None

        print("✓ All data ready to serve")

    # ── Helpers ────────────────────────────────────────────────────────────────

    @classmethod
    def _load_clusters_from_db(cls):
        if cls.db_engine is None:
            cls.clusters_data = None
            return
        try:
            gdf = gpd.read_postgis(
                "SELECT cluster_id, severity, avg_risk, max_risk, min_risk,"
                " cell_count, area_sqkm, district, villages,"
                " village_count, wards, geometry"
                " FROM hotspot_clusters"
                " ORDER BY cell_count DESC",
                con=cls.db_engine,
                geom_col="geometry",
                crs="EPSG:4326"
            )
            cls.clusters_data = json.loads(gdf.to_json())
            print(f"✓ {len(gdf)} hotspot clusters loaded from DB")
        except Exception as e:
            print(f"⚠ Clusters not available ({e})")
            cls.clusters_data = None


    @classmethod
    def _load_villages_from_db(cls):
        if cls.db_engine is None:
            cls.wards_data = None
            return
        try:
            gdf = gpd.read_postgis(
                """SELECT
                    village              AS "VILLAGE",
                    tehsil               AS "TEHSIL",
                    district             AS "DISTRICT",
                    preparedness_score   AS "PREP_SCORE",
                    preparedness_level   AS "PREP_LEVEL",
                    preparedness_color   AS "PREP_COLOR",
                    desilting_pct        AS "DESILTING_PCT",
                    avg_risk_score       AS "AVG_RISK",
                    high_risk_cell_count AS "HIGH_RISK_CELLS",
                    total_cell_count     AS "TOTAL_CELLS",
                    action_items         AS "ACTIONS",
                    TO_CHAR(last_computed, 'YYYY-MM-DD HH24:MI:SS') AS "LAST_COMPUTED",
                    geometry
                FROM villages
                WHERE village IS NOT NULL""",
                con=cls.db_engine,
                geom_col="geometry",
                crs="EPSG:4326"
            )
            cls.wards_data = json.loads(gdf.to_json())
            print(f"✓ {len(gdf)} villages loaded with preparedness scores")

            # Quick check — did scores actually load?
            sample = gdf["PREP_SCORE"].dropna()
            print(f"  Villages with scores: {len(sample)} / {len(gdf)}")
            if len(sample) == 0:
                print("  ⚠ No preparedness scores found — run the Colab push first")

        except Exception as e:
            print(f"✗ Villages DB load failed: {e}")
            cls.wards_data = None

    @classmethod
    def refresh_grid_from_db(cls):
        """
        Called after a rainfall DB update.
        Fetches ONLY the 5 changed columns — geometry stays in RAM untouched.
        Then busts Redis so the next request gets fresh data.
        """
        if cls.db_engine is None:
            print("Cannot refresh — DB not connected")
            return False
        try:
            print("Refreshing grid from DB...")
            t0 = time.time()

            with cls.db_engine.connect() as conn:
                rows = conn.execute(text(
                    "SELECT cell_id, rainfall_24h_mm, rainfall_7day_mm,"
                    " rainfall_risk, risk_score, risk_category"
                    " FROM grid_cells"
                )).fetchall()

            # Build lookup dict — no geometry involved
            updates = {
                r.cell_id: {
                    "rainfall_24h_mm" : r.rainfall_24h_mm,
                    "rainfall_7day_mm": r.rainfall_7day_mm,
                    "rainfall_risk"   : r.rainfall_risk,
                    "risk_score"      : r.risk_score,
                    "risk_category"   : r.risk_category,
                }
                for r in rows
            }

            # Patch in-memory GeoDataFrame in place
            for col in ["rainfall_24h_mm", "rainfall_7day_mm",
                        "rainfall_risk", "risk_score", "risk_category"]:
                cls.grid_gdf[col] = cls.grid_gdf["cell_id"].map(
                    lambda cid, c=col: updates.get(cid, {}).get(c)
                )

            # Re-serialize so /api/grid serves updated values
            cls.grid_data = json.loads(cls.grid_gdf.to_json())

            # Bust Redis
            if cls.redis:
                keys = cls.redis.keys("grid:*")
                if keys:
                    cls.redis.delete(*keys)
                    print(f"  Redis: cleared {len(keys)} cached keys")

            print(f"✓ Grid refreshed in {time.time()-t0:.1f}s")
            return True

        except Exception as e:
            print(f"✗ Grid refresh failed: {e}")
            return False

state = AppState()