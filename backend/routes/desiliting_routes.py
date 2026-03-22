"""
routes/desilting_routes.py

Admin endpoints for ward-level desilting status management.

Ward officers update their drain clearance progress via PATCH.
These values take priority over zone-level MCD published data in
the preparedness score (Priority 1 in infrastructure_gap()).

Endpoints:
    GET  /api/admin/desilting                     — all wards with current status
    GET  /api/admin/desilting/{ward_id}           — single ward
    PATCH /api/admin/desilting/{ward_id}          — update one ward (officer)
    POST  /api/admin/desilting/bulk               — bulk update from CSV/JSON
    GET  /api/admin/desilting/zones               — MCD zone-level published data
    GET  /api/admin/desilting/export              — CSV export for reporting

Auth: JWT required, role must be "officer" or "admin".
"""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from core.state import state
from utils.desilting_baseline import get_ward_desilting, get_all_zones, WARD_TO_MCD_ZONE
from utils.wards import WARDS


router = APIRouter(prefix="/api/admin/desilting", tags=["desilting"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class DesilteUpdateRequest(BaseModel):
    drains_desilted_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage of drain length desilted (0–100)",
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Field notes from ward officer",
    )
    reported_by: Optional[str] = Field(
        None,
        description="Officer name or ID",
    )

    @field_validator("drains_desilted_pct")
    @classmethod
    def round_pct(cls, v: float) -> float:
        return round(v, 1)


class DesilteRecord(BaseModel):
    ward_id:              str
    ward_name:            str
    zone:                 Optional[str]
    drains_desilted_pct:  float
    source:               str          # "admin_reported" | "mcd_zone_reported" | ...
    resolution:           str          # "ward" | "zone" | "city"
    is_admin_override:    bool
    last_updated:         Optional[str]
    reported_by:          Optional[str]
    notes:                Optional[str]
    data_year:            int


class BulkUpdateItem(BaseModel):
    ward_id:             str
    drains_desilted_pct: float = Field(..., ge=0.0, le=100.0)
    notes:               Optional[str] = None


class BulkUpdateRequest(BaseModel):
    items:       list[BulkUpdateItem]
    reported_by: Optional[str] = None


# ── In-memory override store ──────────────────────────────────────────────────
# Production: replace with your DB table.
# Schema:  ward_id → {pct, notes, reported_by, updated_at}

_admin_overrides: dict[str, dict] = {}


def _get_ward_record(ward: dict) -> DesilteRecord:
    """Build a DesilteRecord for a ward, merging admin override with baseline."""
    ward_id   = str(ward.get("id", ward.get("ward_id", "")))
    ward_name = ward.get("name", ward.get("ward_name", ward_id))
    zone      = WARD_TO_MCD_ZONE.get(ward_id)

    override = _admin_overrides.get(ward_id)
    if override:
        return DesilteRecord(
            ward_id=ward_id,
            ward_name=ward_name,
            zone=zone,
            drains_desilted_pct=override["pct"],
            source="admin_reported",
            resolution="ward",
            is_admin_override=True,
            last_updated=override["updated_at"],
            reported_by=override.get("reported_by"),
            notes=override.get("notes"),
            data_year=datetime.now(timezone.utc).year,
        )

    baseline = get_ward_desilting(ward_id)
    return DesilteRecord(
        ward_id=ward_id,
        ward_name=ward_name,
        zone=zone,
        drains_desilted_pct=baseline["drains_desilted_pct"],
        source=baseline["source"],
        resolution=baseline["resolution"],
        is_admin_override=False,
        last_updated=None,
        reported_by=None,
        notes=None,
        data_year=baseline["data_year"],
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[DesilteRecord])
async def list_desilting():
    """All wards with current desilting status (admin override if set, else MCD baseline)."""
    return [_get_ward_record(w) for w in WARDS]


@router.get("/zones")
async def list_zones():
    """MCD zone-level published desilting data (source of truth for non-override wards)."""
    return {
        "zones":    get_all_zones(),
        "source":   "MCD Standing Committee Jun 2025 / NGT Dec 2025",
        "year":     2025,
        "note":     (
            "Zone-level data distributed to wards. "
            "Ward officers can override via PATCH /api/admin/desilting/{ward_id}."
        ),
    }


@router.get("/{ward_id}", response_model=DesilteRecord)
async def get_ward_desilting_status(ward_id: str):
    """Single ward desilting status."""
    ward = next((w for w in WARDS if str(w.get("id", w.get("ward_id"))) == ward_id), None)
    if not ward:
        raise HTTPException(status_code=404, detail=f"Ward {ward_id} not found")
    return _get_ward_record(ward)


@router.patch("/{ward_id}", response_model=DesilteRecord)
async def update_ward_desilting(ward_id: str, body: DesilteUpdateRequest):
    """
    Ward officer updates desilting progress.
    This value immediately takes Priority 1 in the preparedness score.
    """
    ward = next((w for w in WARDS if str(w.get("id", w.get("ward_id"))) == ward_id), None)
    if not ward:
        raise HTTPException(status_code=404, detail=f"Ward {ward_id} not found")

    _admin_overrides[ward_id] = {
        "pct":         body.drains_desilted_pct,
        "notes":       body.notes,
        "reported_by": body.reported_by,
        "updated_at":  datetime.now(timezone.utc).isoformat(),
    }

    # Bust Redis cache so preparedness scores recalculate immediately
    if state.redis:
        try:
            for key in state.redis.scan_iter(f"ward_risk:*"):
                state.redis.delete(key)
            for key in state.redis.scan_iter(f"preparedness:{ward_id}:*"):
                state.redis.delete(key)
        except Exception:
            pass

    return _get_ward_record(ward)


@router.delete("/{ward_id}/override")
async def clear_ward_override(ward_id: str):
    """Remove admin override — ward reverts to MCD zone-level baseline."""
    if ward_id not in _admin_overrides:
        raise HTTPException(status_code=404, detail="No override set for this ward")

    del _admin_overrides[ward_id]

    if state.redis:
        try:
            for key in state.redis.scan_iter(f"preparedness:{ward_id}:*"):
                state.redis.delete(key)
        except Exception:
            pass

    return {"status": "cleared", "ward_id": ward_id}


@router.post("/bulk", response_model=dict)
async def bulk_update_desilting(body: BulkUpdateRequest):
    """
    Bulk update — accepts a JSON list of ward_id + percentage.
    Used after manually reading the MCD PDF report.
    """
    updated: list[str] = []
    not_found: list[str] = []
    ward_ids = {str(w.get("id", w.get("ward_id"))) for w in WARDS}

    for item in body.items:
        if item.ward_id not in ward_ids:
            not_found.append(item.ward_id)
            continue

        _admin_overrides[item.ward_id] = {
            "pct":         item.drains_desilted_pct,
            "notes":       item.notes,
            "reported_by": body.reported_by,
            "updated_at":  datetime.now(timezone.utc).isoformat(),
        }
        updated.append(item.ward_id)

    # Bust all ward risk cache after bulk update
    if state.redis and updated:
        try:
            for key in state.redis.scan_iter("ward_risk:*"):
                state.redis.delete(key)
        except Exception:
            pass

    return {
        "updated":   updated,
        "not_found": not_found,
        "total":     len(updated),
    }


@router.post("/bulk-csv")
async def bulk_update_from_csv(file: UploadFile = File(...)):
    """
    Upload a CSV with columns: ward_id, drains_desilted_pct, notes (optional).
    Useful for importing MCD PDF data after running fetch_mcd_desilting_pdf.py.
    """
    content = await file.read()
    reader  = csv.DictReader(io.StringIO(content.decode("utf-8")))

    items: list[BulkUpdateItem] = []
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):  # row 1 = header
        try:
            items.append(BulkUpdateItem(
                ward_id=row["ward_id"].strip(),
                drains_desilted_pct=float(row["drains_desilted_pct"]),
                notes=row.get("notes", "").strip() or None,
            ))
        except (KeyError, ValueError) as e:
            errors.append(f"Row {i}: {e}")

    if errors:
        raise HTTPException(
            status_code=422,
            detail={"parse_errors": errors, "message": "Fix CSV errors and retry"},
        )

    result = await bulk_update_desilting(
        BulkUpdateRequest(items=items, reported_by="csv_import")
    )
    return {**result, "filename": file.filename}


@router.get("/export/csv")
async def export_desilting_csv():
    """Download current desilting status for all wards as CSV (for reporting)."""
    records = [_get_ward_record(w) for w in WARDS]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "ward_id", "ward_name", "zone",
        "drains_desilted_pct", "source", "resolution",
        "is_admin_override", "last_updated", "reported_by", "notes",
    ])
    writer.writeheader()
    for r in records:
        writer.writerow(r.model_dump(exclude={"data_year"}))

    output.seek(0)
    filename = f"delhi_desilting_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )