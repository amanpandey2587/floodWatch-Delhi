"""
utils/preparedness.py

Pre-Monsoon Readiness Score for Delhi wards.

Formula (100 = fully prepared, 0 = critical gap):
    Score = 100 × (1 − risk_index)

    risk_index = 0.35 × terrain_vulnerability
               + 0.20 × rainfall_exposure
               + 0.20 × infrastructure_gap
               + 0.15 × impervious_burden
               + 0.10 × operational_gap

Each sub-score is 0–1 (1 = highest risk / worst readiness).
The final score inverts this so higher = better for authorities.

Data source priority per sub-score is documented inline.
All functions return (score: float, source: str) tuples so callers
can attach full provenance to API responses.
"""

from __future__ import annotations

import numpy as np
from typing import Any

from .desilting_baseline import get_ward_desilting


# ── 1. Terrain vulnerability (35%) ───────────────────────────────────────────

def terrain_vulnerability(ward_cells: list[dict]) -> tuple[float, str]:
    """
    Scores the ward's intrinsic flood susceptibility from terrain.

    Priority 1 — real DEM derivatives (ML participant output):
        twi, flow_accum_log, curvature, slope
    Priority 2 — existing GeoJSON fields (already in grid_with_risk.geojson):
        low_elev_risk, elev_percentile, drainage_risk, risk_score
    """
    if not ward_cells:
        return 0.5, "no_cells"

    has_dem = any("twi" in c for c in ward_cells)

    if has_dem:
        twi_score = float(np.clip(
            (np.mean([c.get("twi", 0) for c in ward_cells]) - 2) / 16,
            0, 1
        ))
        fa_score = float(np.clip(
            np.mean([c.get("flow_accum_log", 0) for c in ward_cells]) / 10,
            0, 1
        ))
        curv_score = float(np.clip(
            (-np.mean([c.get("curvature", 0) for c in ward_cells]) + 5) / 10,
            0, 1
        ))
        slope_score = float(np.clip(
            1 - (np.mean([c.get("slope", 1) for c in ward_cells]) / 10),
            0, 1
        ))
        score = (
            0.40 * twi_score   +
            0.25 * fa_score    +
            0.20 * curv_score  +
            0.15 * slope_score
        )
        return float(np.clip(score, 0, 1)), "dem_derived"

    # Fallback: your existing cell fields are solid proxies
    low_elev      = np.mean([c.get("low_elev_risk",    0.5) for c in ward_cells])
    elev_inv      = np.mean([1 - c.get("elev_percentile", 0.5) for c in ward_cells])
    drain_risk    = np.mean([c.get("drainage_risk",    0.5) for c in ward_cells])
    risk_avg      = np.mean([c.get("risk_score",       0.3) for c in ward_cells])

    score = (
        0.40 * low_elev                            +
        0.25 * float(np.clip(elev_inv, 0, 1))     +
        0.20 * float(np.clip(drain_risk, 0, 1))   +
        0.15 * float(np.clip(risk_avg / 0.8, 0, 1))
    )
    return float(np.clip(score, 0, 1)), "geojson_proxy"


# ── 2. Rainfall exposure (20%) ────────────────────────────────────────────────

def rainfall_exposure(
    ward: dict,
    ward_cells: list[dict],
) -> tuple[float, str]:
    """
    90th-percentile monsoon rainfall intensity for the ward.

    Priority 1 — Open-Meteo historical P90 (rainfall.py, 10-season window).
    Priority 2 — P90 of cell-level 7-day rainfall (approximate).
    Priority 3 — Delhi climatological baseline (80 mm).

    Delhi normalisation range: 50 mm (dry year P90) → 200 mm (extreme event).
    """
    if ward.get("rainfall_p90_mm") is not None:
        p90    = float(ward["rainfall_p90_mm"])
        source = "open_meteo_historical"

    elif ward_cells and any(c.get("rainfall_7day_mm", 0) > 0 for c in ward_cells):
        vals   = [c.get("rainfall_7day_mm", 0) for c in ward_cells]
        p90    = float(np.percentile(vals, 90))
        source = "cell_7day_p90_proxy"

    else:
        p90    = 80.0
        source = "delhi_climatological_baseline"

    score = float(np.clip((p90 - 50) / 150, 0, 1))
    return score, source


# ── 3. Infrastructure gap (20%) ───────────────────────────────────────────────

def infrastructure_gap(
    ward: dict,
    ward_cells: list[dict],
) -> tuple[float, str]:
    """
    Combines drain network coverage with pre-monsoon clearance status.

    Drain coverage sub-score:
      Priority 1 — OSM drain density from drainage.py (m of drain / km²).
      Priority 2 — mean drain_distance_m from cells (already in GeoJSON).

    Clearance sub-score:
      Priority 1 — admin-reported drains_desilted_pct (ward officer input).
      Priority 2 — zone-level MCD published data (desilting_baseline.py).
      Priority 3 — drain-tagged complaint density as operational signal.

    Drainage risk from cells provides a third signal throughout.
    """
    # ── Drain coverage ────────────────────────────────────────────────────
    if ward.get("drain_density_m_per_km2") is not None:
        # OSM-derived density: Delhi range 100–800 m/km²
        drain_gap  = float(np.clip(
            1 - (ward["drain_density_m_per_km2"] / 800), 0, 1
        ))
        cov_source = "osm_drain_density"
    else:
        avg_dist   = float(np.mean([
            c.get("drain_distance_m", 5000) for c in ward_cells
        ])) if ward_cells else 5000.0
        drain_gap  = float(np.clip((avg_dist - 500) / 9500, 0, 1))
        cov_source = "cell_drain_distance_proxy"

    # ── Clearance status ──────────────────────────────────────────────────
    ward_id = ward.get("id") or ward.get("ward_id") or ""

    if ward.get("drains_desilted_pct") is not None:
        # Admin panel — most accurate
        clearance_gap = 1.0 - (float(ward["drains_desilted_pct"]) / 100.0)
        desilt_source = "admin_reported"

    else:
        # MCD published zone data
        baseline      = get_ward_desilting(str(ward_id))
        clearance_gap = 1.0 - (baseline["drains_desilted_pct"] / 100.0)
        desilt_source = baseline["source"]

    # Complaint signal supplements clearance (not replaces it)
    drain_complaints = ward.get("drain_complaints_count", 0)
    total_complaints = max(ward.get("complaints_total", 1), 1)
    complaint_signal = float(np.clip(
        (drain_complaints / total_complaints) * 1.5, 0, 1
    ))

    # Blend clearance gap with complaint signal (complaints add weight to gap)
    clearance_blended = float(np.clip(
        0.75 * clearance_gap + 0.25 * complaint_signal, 0, 1
    ))

    # Cell-level drainage risk as third signal
    avg_drain_risk = float(np.mean([
        c.get("drainage_risk", 0.5) for c in ward_cells
    ])) if ward_cells else 0.5

    score = float(np.clip(
        0.45 * drain_gap          +
        0.35 * clearance_blended  +
        0.20 * avg_drain_risk,
        0, 1
    ))

    return score, f"{cov_source}+{desilt_source}"


# ── 4. Impervious burden (15%) ────────────────────────────────────────────────

def impervious_burden(ward_cells: list[dict]) -> tuple[float, str]:
    """
    Fraction of cell area covered by impervious surface (roads, concrete).
    High impervious fraction → runoff has nowhere to infiltrate.

    Priority 1 — imperv_frac from ESA WorldCover 2021 (ML participant).
    Priority 2 — urban area default (0.60 for dense Delhi wards).
    """
    if not ward_cells:
        return 0.5, "no_cells"

    real_vals = [
        c["imperv_frac"] for c in ward_cells
        if c.get("imperv_frac") is not None and c["imperv_frac"] != 0.5
    ]

    if real_vals:
        return float(np.clip(np.mean(real_vals), 0, 1)), "esa_worldcover_2021"

    # Dense Delhi wards are typically 55–70% impervious
    return 0.60, "delhi_urban_default"


# ── 5. Operational gap (10%) ──────────────────────────────────────────────────

def operational_gap(ward: dict) -> tuple[float, str]:
    """
    Operational readiness of ward authorities.

    Pump availability:    pumps_available / pumps_total
    Complaint resolution: resolved / total in this ward
    """
    pumps_total     = max(int(ward.get("pumps_total", 1)), 1)
    pumps_available = int(ward.get("pumps_available", 0))
    pump_gap        = 1.0 - (pumps_available / pumps_total)

    resolved = int(ward.get("complaints_resolved", 0))
    total    = max(int(ward.get("complaints_total", 1)), 1)
    resolution_gap = 1.0 - (resolved / total)

    score = float(np.clip(
        0.60 * pump_gap + 0.40 * resolution_gap, 0, 1
    ))
    return score, "ward_operational_data"


# ── Master function ────────────────────────────────────────────────────────────

def calculate_ward_preparedness(
    ward: dict,
    ward_cells: list[dict],
) -> dict[str, Any]:
    """
    Computes the Pre-Monsoon Readiness Score for a single ward.

    Args:
        ward:       Ward dict from WARDS constant or DB row.
                    Expected keys: id, pumps_total, pumps_available,
                    complaints_total, complaints_resolved, drains_desilted_pct
                    (optional), rainfall_p90_mm (optional),
                    drain_density_m_per_km2 (optional).
        ward_cells: List of grid cell property dicts that fall within this ward.
                    Each cell is a feature["properties"] dict from grid_with_risk.geojson.

    Returns:
        {
            score:        float   — 0–100, higher = more prepared
            level:        str     — "Prepared" | "Moderate gap" | "High gap" | "Critical gap"
            color:        str     — hex colour for map/UI rendering
            has_gap:      bool    — True if score < 55
            gap_message:  str     — highest-priority action item
            action_items: list    — all triggered action strings, priority ordered
            breakdown:    dict    — per-dimension 0–100 scores
            data_quality: dict    — "real" | "proxy" | "estimated" per dimension
            data_sources: dict    — source string per dimension for audit trail
        }
    """
    tv, tv_src = terrain_vulnerability(ward_cells)
    re, re_src = rainfall_exposure(ward, ward_cells)
    ig, ig_src = infrastructure_gap(ward, ward_cells)
    ib, ib_src = impervious_burden(ward_cells)
    og, og_src = operational_gap(ward)

    risk_index = (
        0.35 * tv +
        0.20 * re +
        0.20 * ig +
        0.15 * ib +
        0.10 * og
    )

    score = round((1.0 - risk_index) * 100.0, 1)

    if score >= 75:
        level, color = "Prepared",     "#2ecc71"
    elif score >= 55:
        level, color = "Moderate gap", "#f1c40f"
    elif score >= 35:
        level, color = "High gap",     "#e67e22"
    else:
        level, color = "Critical gap", "#e74c3c"

    # Action items — ordered by severity of contributing gap
    actions: list[str] = []
    if ig > 0.6:
        actions.append("Desilt drains before June 1")
    if og > 0.6:
        actions.append("Deploy additional pumps — below operational target")
    if tv > 0.7:
        actions.append("High terrain risk — pre-position emergency crew")
    if ib > 0.7:
        actions.append("High impervious cover — inspect stormwater outlets")
    if re > 0.7:
        actions.append("Heavy rainfall zone — lower early-warning threshold")

    # Data quality flags — surfaced in API responses and admin UI
    _real_sources = {"dem_derived", "open_meteo_historical", "esa_worldcover_2021",
                     "ward_operational_data"}

    def _quality(src: str) -> str:
        if src in _real_sources:
            return "real"
        if "proxy" in src or "default" in src or "baseline" in src:
            return "estimated"
        return "partial"

    data_quality = {
        "terrain":    _quality(tv_src),
        "rainfall":   _quality(re_src),
        "drainage":   _quality(ig_src),
        "impervious": _quality(ib_src),
        "operational": "real",
        "overall": (
            "real" if all(
                _quality(s) == "real"
                for s in [tv_src, re_src, ig_src, ib_src]
            ) else "partial"
        ),
    }

    return {
        "score":        score,
        "level":        level,
        "color":        color,
        "has_gap":      score < 55,
        "gap_message":  actions[0] if actions else "No critical gaps identified",
        "action_items": actions,
        "breakdown": {
            "terrain_vulnerability": round(tv * 100, 1),
            "rainfall_exposure":     round(re * 100, 1),
            "infrastructure_gap":    round(ig * 100, 1),
            "impervious_burden":     round(ib * 100, 1),
            "operational_gap":       round(og * 100, 1),
        },
        "data_quality": data_quality,
        "data_sources": {
            "terrain":    tv_src,
            "rainfall":   re_src,
            "drainage":   ig_src,
            "impervious": ib_src,
            "operational": og_src,
        },
    }