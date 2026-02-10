from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
from complaints import ComplaintCreate, ComplaintUpdate, ComplaintRating
from controllers.complaint_controller import ComplaintController

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

@router.post("")
async def create_complaint(
    complaint: ComplaintCreate, 
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """File a new complaint"""
    result = ComplaintController.create_complaint(complaint, user_id)
    return JSONResponse(status_code=201, content=result)

@router.get("")
async def list_complaints(
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    role: Optional[str] = Header(None, alias="X-User-Role"),
    ward_number: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    """Get complaints - filtered by role"""
    return ComplaintController.list_complaints(user_id, role, ward_number, status)

@router.get("/{complaint_id}")
async def get_complaint(complaint_id: str):
    """Get complaint details"""
    return ComplaintController.get_complaint(complaint_id)

@router.get("/track/{complaint_id}")
async def track_complaint_public(complaint_id: str):
    """Public complaint tracking"""
    return ComplaintController.get_complaint(complaint_id)

@router.put("/{complaint_id}/assign")
async def assign_complaint(
    complaint_id: str,
    officer_id: str = Header(..., alias="X-Officer-ID"),
    assigned_by: str = Header(..., alias="X-User-ID")
):
    """Assign complaint to officer"""
    return ComplaintController.assign_complaint(complaint_id, officer_id, assigned_by)

@router.put("/{complaint_id}/status")
async def update_status(
    complaint_id: str,
    update: ComplaintUpdate,
    updated_by: str = Header(..., alias="X-User-ID")
):
    """Update complaint status"""
    return ComplaintController.update_status(complaint_id, update, updated_by)

@router.post("/{complaint_id}/timeline")
async def add_timeline(
    complaint_id: str,
    entry: dict,
    updated_by: str = Header(..., alias="X-User-ID")
):
    """Add timeline entry"""
    return ComplaintController.add_timeline(complaint_id, entry, updated_by)

@router.put("/{complaint_id}/resolve")
async def resolve_complaint(
    complaint_id: str,
    resolution_data: dict,
    resolved_by: str = Header(..., alias="X-User-ID")
):
    """Resolve complaint"""
    return ComplaintController.resolve_complaint(complaint_id, resolution_data, resolved_by)

@router.post("/{complaint_id}/rate")
async def rate_complaint(
    complaint_id: str,
    rating_data: ComplaintRating,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Rate a complaint"""
    return ComplaintController.rate_complaint(complaint_id, rating_data, user_id)

@router.get("/user/{user_id}")
async def get_user_complaints(user_id: str):
    """Get complaints by user"""
    return ComplaintController.list_complaints(user_id, None, None, None)

@router.get("/ward/{ward_number}")
async def get_ward_complaints(ward_number: int):
    """Get complaints by ward"""
    return ComplaintController.list_complaints(None, "ward_admin", ward_number, None)
