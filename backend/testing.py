"""
MCD Delhi Ward Map Generator
==============================
Parses the MCD ward/colony/zone delimitation PDF and plots all 250+ wards
on an interactive Folium map, with colony lists shown on click.

Requirements:
    pip install pdfplumber folium geopy tqdm

Usage:
    python mcd_delhi_ward_map.py --pdf "New_colony_ward_zone_mapping__1_.pdf"

Output:
    mcd_delhi_ward_map.html  — open in any browser
"""

import argparse
import json
import time
import re
from pathlib import Path
from collections import defaultdict

# ── Parse arguments ──────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="MCD Delhi Ward Map Generator")
parser.add_argument(
    "--pdf",
    default="checker_file",
    help="Path to the MCD colony/ward/zone PDF",
)
parser.add_argument(
    "--output",
    default="mcd_delhi_ward_map.html",
    help="Output HTML map file name",
)
parser.add_argument(
    "--geocode-delay",
    type=float,
    default=1.2,
    help="Seconds to wait between geocoding requests (default 1.2 — respects Nominatim rate limit)",
)
args = parser.parse_args()

# ── Step 1: Extract data from PDF ────────────────────────────────────────────
print("📄 Reading PDF…")
import pdfplumber

ward_colonies: dict[str, list[str]] = defaultdict(list)
ward_zone: dict[str, str] = {}

SKIP_HEADERS = {"New Ward", "Ward", "New Colony", "Colony"}

with pdfplumber.open(args.pdf) as pdf:
    for page in pdf.pages:
        for table in (page.extract_tables() or []):
            for row in table:
                if not row or len(row) < 6:
                    continue
                raw_colony = (row[3] or "").strip().replace("\n", " ")
                raw_ward   = (row[4] or "").strip().replace("\n", " ")
                raw_zone   = (row[5] or "").strip().replace("\n", " ")

                if not raw_ward or raw_ward in SKIP_HEADERS:
                    continue

                ward = raw_ward
                if raw_colony and raw_colony not in SKIP_HEADERS:
                    ward_colonies[ward].append(raw_colony)
                if raw_zone and raw_zone not in {"New Zone", "Zone"}:
                    ward_zone[ward] = raw_zone

# Ensure every ward has an entry even if no zone was found
for w in ward_colonies:
    ward_zone.setdefault(w, "UNKNOWN ZONE")

all_wards = sorted(ward_colonies.keys())
print(f"  ✅ Found {len(all_wards)} wards across {len(set(ward_zone.values()))} zones")

# ── Step 2: Geocode each ward ─────────────────────────────────────────────────
print("\n🌍 Geocoding ward centres (this takes ~5 min due to rate limits)…")
print("   Tip: results are cached in ward_coords_cache.json — re-runs are instant.\n")

from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from tqdm import tqdm

CACHE_FILE = Path("ward_coords_cache.json")
cache: dict[str, list[float] | None] = {}
if CACHE_FILE.exists():
    cache = json.loads(CACHE_FILE.read_text())
    print(f"  Loaded {len(cache)} cached coordinates.")

geolocator = Nominatim(user_agent="mcd_delhi_ward_mapper_v1")

def geocode_ward(ward_name: str) -> list[float] | None:
    """Try several query forms; return [lat, lon] or None."""
    queries = [
        f"{ward_name} ward, Delhi, India",
        f"{ward_name}, Delhi, India",
        f"{ward_name} Delhi",
    ]
    for q in queries:
        try:
            loc = geolocator.geocode(q, timeout=10)
            if loc:
                return [loc.latitude, loc.longitude]
        except (GeocoderTimedOut, GeocoderServiceError):
            time.sleep(2)
    return None

new_lookups = 0
for ward in tqdm(all_wards, desc="Geocoding", unit="ward"):
    if ward in cache:
        continue
    coords = geocode_ward(ward)
    cache[ward] = coords
    new_lookups += 1
    time.sleep(args.geocode_delay)   # respect Nominatim 1 req/sec limit

if new_lookups:
    CACHE_FILE.write_text(json.dumps(cache, indent=2))
    print(f"\n  💾 Cached {new_lookups} new results → {CACHE_FILE}")

found    = sum(1 for v in cache.values() if v)
missing  = [w for w in all_wards if not cache.get(w)]
print(f"  ✅ Geocoded {found}/{len(all_wards)} wards")
if missing:
    print(f"  ⚠️  Could not geocode {len(missing)} wards: {missing[:10]}{'…' if len(missing)>10 else ''}")

# ── Step 3: Build the Folium map ──────────────────────────────────────────────
print("\n🗺️  Building interactive map…")
import folium
from folium.plugins import MarkerCluster, Search

# Colour palette — one per zone
ZONE_COLOURS = {
    "ROHINI ZONE":        "#e74c3c",   # red
    "NARELA ZONE":        "#e67e22",   # orange
    "KESHAVPURAM ZONE":   "#f1c40f",   # yellow
    "CIVIL LINE ZONE":    "#2ecc71",   # green
    "CITY S.P. ZONE":     "#1abc9c",   # teal
    "KAROL BAGH ZONE":    "#3498db",   # blue
    "WEST ZONE":          "#9b59b6",   # purple
    "SOUTH ZONE":         "#e91e63",   # pink
    "NAJAFGARH ZONE":     "#795548",   # brown
    "SHAHDARA NORTH ZONE":"#607d8b",   # blue-grey
    "SHAHDARA SOUTH ZONE":"#00bcd4",   # cyan
    "CENTRAL ZONE":       "#ff5722",   # deep orange
    "SHAHDARA NORTH":     "#607d8b",   # alias
    "UNKNOWN ZONE":       "#95a5a6",   # grey
}

def zone_colour(zone: str) -> str:
    return ZONE_COLOURS.get(zone, "#95a5a6")

# Delhi centre
m = folium.Map(
    location=[28.6139, 77.2090],
    zoom_start=11,
    tiles="CartoDB Positron",
)

# ── Legend ────────────────────────────────────────────────────────────────────
unique_zones = sorted(set(ward_zone.values()))
legend_rows = "".join(
    f'<tr><td style="width:18px;height:18px;background:{zone_colour(z)};'
    f'border-radius:3px;margin-right:6px"></td>'
    f'<td style="font-size:12px;padding:2px 4px">{z}</td></tr>'
    for z in unique_zones
)
legend_html = f"""
<div style="position:fixed;bottom:40px;left:20px;z-index:9999;
            background:white;padding:12px 16px;border-radius:8px;
            box-shadow:2px 2px 8px rgba(0,0,0,.3);font-family:sans-serif">
  <b style="font-size:13px">MCD Zones</b>
  <table style="margin-top:6px;border-collapse:collapse">{legend_rows}</table>
  <div style="font-size:10px;color:#888;margin-top:6px">
    Click a marker for ward & colony details
  </div>
</div>
"""
m.get_root().html.add_child(folium.Element(legend_html))

# ── Title ─────────────────────────────────────────────────────────────────────
title_html = """
<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);
            z-index:9999;background:white;padding:8px 20px;border-radius:8px;
            box-shadow:2px 2px 8px rgba(0,0,0,.3);font-family:sans-serif">
  <b style="font-size:15px">MCD Delhi — Wards & Colonies (Post-Delimitation 2022)</b>
</div>
"""
m.get_root().html.add_child(folium.Element(title_html))

# ── One FeatureGroup per zone (for layer control) ─────────────────────────────
zone_groups: dict[str, folium.FeatureGroup] = {}
for zone in unique_zones:
    fg = folium.FeatureGroup(name=zone, show=True)
    zone_groups[zone] = fg
    m.add_child(fg)

# ── Place ward markers ────────────────────────────────────────────────────────
placed = 0
for ward in all_wards:
    coords = cache.get(ward)
    if not coords:
        continue

    zone  = ward_zone[ward]
    cols  = ward_colonies[ward]
    colour = zone_colour(zone)

    # Build a compact colony list for the popup
    cols_sorted = sorted(set(cols))
    colony_html = "".join(
        f'<li style="font-size:11px;padding:1px 0">{c}</li>'
        for c in cols_sorted
    )

    popup_html = f"""
    <div style="font-family:sans-serif;max-width:340px;max-height:320px;overflow-y:auto">
      <b style="font-size:14px">{ward}</b><br>
      <span style="font-size:11px;color:{colour};font-weight:600">{zone}</span>
      <hr style="margin:6px 0">
      <b style="font-size:12px">Colonies / localities ({len(cols_sorted)}):</b>
      <ul style="margin:4px 0;padding-left:16px">{colony_html}</ul>
    </div>
    """

    folium.CircleMarker(
        location=coords,
        radius=8,
        color=colour,
        fill=True,
        fill_color=colour,
        fill_opacity=0.75,
        weight=1.5,
        tooltip=folium.Tooltip(
            f"<b>{ward}</b><br><span style='color:{colour}'>{zone}</span>"
            f"<br>{len(cols_sorted)} colonies",
            sticky=True,
        ),
        popup=folium.Popup(folium.Html(popup_html, script=True), max_width=360),
    ).add_to(zone_groups[zone])

    placed += 1

# ── Layer control ─────────────────────────────────────────────────────────────
folium.LayerControl(collapsed=False).add_to(m)

# ── Save ──────────────────────────────────────────────────────────────────────
out = Path(args.output)
m.save(str(out))
print(f"\n✅ Map saved → {out.resolve()}")
print(f"   {placed} wards plotted  |  {len(all_wards) - placed} could not be geocoded")
print("\n👉 Open the HTML file in any browser to explore the map.")
print("   • Hover over a dot for the ward name & zone")
print("   • Click a dot for the full colony list")
print("   • Use the layer panel (top-right) to toggle zones on/off")