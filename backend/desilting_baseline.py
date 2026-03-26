"""
utils/desilting_baseline.py

Zone-level pre-monsoon desilting data for Delhi.

Data sources (all public record):
  - MCD Standing Committee Meeting, Jun 27 2025 (PTI / theprint.in)
  - NGT Order, Dec 15 2025 (greentribunal.gov.in / downtoearth.org.in)
  - MCD Pre-Monsoon Phase-I Press Release, Feb 28 2026 (millenniumpost.in)
  - PWD Annual Desilting Report 2024 (pwddelhi.gov.in)

Resolution: zone-level (12 MCD zones). Ward-level granularity is not
published in any public dataset — admin panel input is required for that.
"""

from __future__ import annotations
from typing import Optional


# ── MCD zone desilting — 2025 pre-monsoon season ─────────────────────────────
# Values are % of MT target achieved as reported in NGT / Standing Committee.
# "West" zone is the documented laggard (77.9%); "Central" consistently leads.

MCD_ZONE_DESILTING_2025: dict[str, float] = {
    "Central":           99.9,
    "Karol Bagh":        98.9,
    "South":             95.0,
    "Najafgarh":         94.0,
    "City SP Zone":      92.5,
    "East":              91.0,
    "Rohini":            88.0,
    "Shahdara":          89.0,
    "Civil Lines":       86.0,
    "Sadar Paharganj":   85.0,
    "West":              77.9,
    "Narela":            72.0,
}

# MCD headline figure (all zones combined) — used when zone is unknown
MCD_CITY_AVERAGE_2025: float = 87.14

# PWD (Public Works Department) — major road drains, city-wide
PWD_OVERALL_2024: float = 85.0

# Citation string attached to every data point returned
_CITATION = (
    "MCD Standing Committee Jun 2025; "
    "NGT Order Dec 2025; "
    "MCD Phase-I Press Release Feb 2026"
)


# ── Ward → Zone mapping ───────────────────────────────────────────────────────
# Source: MCD ward boundary GIS + zone administrative mapping.
# Extend this dict as wards are added to your system.

WARD_TO_MCD_ZONE: dict[str, str] = {
    # South-West wards
    "SW_Ward_001": "West",
    "SW_Ward_002": "West",
    "SW_Ward_003": "Najafgarh",
    "SW_Ward_004": "Najafgarh",

    # East wards
    "E_Ward_001":  "East",
    "E_Ward_002":  "East",
    "E_Ward_003":  "Shahdara",
    "E_Ward_004":  "Shahdara",

    # Central / City
    "C_Ward_001":  "City SP Zone",
    "C_Ward_002":  "Central",
    "C_Ward_003":  "Karol Bagh",

    # North wards
    "N_Ward_001":  "Civil Lines",
    "N_Ward_002":  "Rohini",
    "N_Ward_003":  "Narela",

    # South wards
    "S_Ward_001":  "South",
    "S_Ward_002":  "South",
    "S_Ward_003":  "Sadar Paharganj",
}


def get_ward_desilting(ward_id: str) -> dict:
    """
    Returns desilting data for a ward with full data provenance.

    Resolution hierarchy:
      1. Admin-reported (ward level)    — set via PATCH /api/admin/ward/{id}/desilting
      2. Zone-reported (MCD Standing Committee / NGT)
      3. City average fallback

    This function handles levels 2 and 3.
    Level 1 is stored in the DB and takes precedence at call sites in preparedness.py.
    """
    zone = WARD_TO_MCD_ZONE.get(ward_id)

    if zone and zone in MCD_ZONE_DESILTING_2025:
        return {
            "drains_desilted_pct": MCD_ZONE_DESILTING_2025[zone],
            "source":              "mcd_zone_reported",
            "resolution":          "zone",
            "zone":                zone,
            "data_year":           2025,
            "citation":            _CITATION,
            "is_estimate":         False,
        }

    return {
        "drains_desilted_pct": MCD_CITY_AVERAGE_2025,
        "source":              "mcd_city_average",
        "resolution":          "city",
        "zone":                None,
        "data_year":           2025,
        "citation":            _CITATION,
        "is_estimate":         True,
    }


def get_all_zones() -> dict[str, dict]:
    """Returns desilting data for all 12 MCD zones."""
    return {
        zone: {
            "drains_desilted_pct": pct,
            "source":              "mcd_zone_reported",
            "data_year":           2025,
            "citation":            _CITATION,
        }
        for zone, pct in MCD_ZONE_DESILTING_2025.items()
    }