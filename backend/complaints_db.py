# Updated complaint functions using MongoDB
from fastapi import HTTPException
from complaints import (
    ComplaintStatus, ComplaintPriority, ComplaintCreate, 
    ComplaintUpdate, ComplaintRating
)
from models import ComplaintModel
from notifications import create_notification_for_ward_admin, create_complaint_status_notification
from typing import Optional, List, Dict, Any
from datetime import datetime
from image_verification import verify_images_batch, get_verification_summary
import uuid

# Update the file_complaint function
def file_complaint(complaint_data: ComplaintCreate, user_id: str) -> dict:
    """File a new complaint with AI image verification"""
    complaint_id = f"COMP-{uuid.uuid4().hex[:8].upper()}"
    
    # AI IMAGE VERIFICATION
    verification_results = []
    verification_summary = None
    
    if complaint_data.attachments and len(complaint_data.attachments) > 0:
        print(f"[FileComplaint] Verifying {len(complaint_data.attachments)} images for complaint {complaint_id}")
        try:
            verification_results = verify_images_batch(complaint_data.attachments)
            verification_summary = get_verification_summary(verification_results)
            print(f"[FileComplaint] Verification summary: {verification_summary}")
        except Exception as e:
            print(f"[FileComplaint] WARNING: Image verification failed: {e}")
            # Continue without verification if it fails (graceful degradation)
            verification_results = []
            verification_summary = None
    
    # Convert location to dict if it's a Pydantic model
    location_dict = None
    if complaint_data.location:
        if hasattr(complaint_data.location, 'model_dump'):
            location_dict = complaint_data.location.model_dump()
        elif hasattr(complaint_data.location, 'dict'):
            location_dict = complaint_data.location.dict()
        else:
            location_dict = complaint_data.location
    
    now = datetime.now()
    
    complaint = {
        "complaint_id": complaint_id,
        "title": complaint_data.title,
        "description": complaint_data.description,
        "category": complaint_data.category,
        "ward_number": complaint_data.ward_number,
        "status": ComplaintStatus.PENDING.value,
        "priority": complaint_data.priority.value,
        "created_by": user_id,
        "assigned_officer_id": None,
        "location": location_dict,
        "attachments": complaint_data.attachments or [],
        "water_depth": complaint_data.water_depth.value if complaint_data.water_depth else None,
        "image_verification": {  # ADD THIS FIELD
            "results": verification_results,
            "summary": verification_summary,
            "verified_at": now.isoformat() if verification_results else None
        },
        # SLA Tracking
        "sla_target_hours": 24,
        "reported_at": now,
        "acknowledged_at": None,
        "in_progress_at": None,
        "resolved_at": None,
        "sla_status": "within_sla",
        "timeline": [{
            "timestamp": now,
            "status": ComplaintStatus.PENDING.value,
            "remarks": "Complaint filed" + (
                f" - {verification_summary['verified_count']}/{verification_summary['total_images']} images verified"
                if verification_summary else ""
            ) + (
                f" - Water Depth: {complaint_data.water_depth.value}"
                if complaint_data.water_depth else ""
            ),
            "updated_by": user_id
        }],
        "response_time_hours": None,
        "resolution": None,
        "rating": None,
        "feedback": None,
        "eta_hours": None,
        "eta_updated_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    # Save to MongoDB
    ComplaintModel.create(complaint)
    
    # Auto-assign to ward officer
    auto_assign_complaint(complaint_id, complaint_data.ward_number)
    
    # Create notification for ward admin
    create_notification_for_ward_admin(complaint_data.ward_number, complaint_id, complaint_data.title)
    
    # Get the complaint back with ISO formatted dates
    saved_complaint = get_complaint_by_id(complaint_id)
    
    return saved_complaint

def auto_assign_complaint(complaint_id: str, ward_number: int):
    """Auto-assign complaint to ward admin (placeholder)"""
    # In future, assign to specific ward officer
    pass

def get_complaint_by_id(complaint_id: str) -> Optional[dict]:
    """Get complaint by ID"""
    complaint = ComplaintModel.find_by_id(complaint_id)
    if complaint:
        # Convert datetime to ISO
        if "created_at" in complaint and isinstance(complaint["created_at"], datetime):
            complaint["created_at"] = complaint["created_at"].isoformat()
        if "updated_at" in complaint and isinstance(complaint["updated_at"], datetime):
            complaint["updated_at"] = complaint["updated_at"].isoformat()
        if "reported_at" in complaint and isinstance(complaint["reported_at"], datetime):
            complaint["reported_at"] = complaint["reported_at"].isoformat()
        if "acknowledged_at" in complaint and isinstance(complaint["acknowledged_at"], datetime):
            complaint["acknowledged_at"] = complaint["acknowledged_at"].isoformat() if complaint["acknowledged_at"] else None
        if "in_progress_at" in complaint and isinstance(complaint["in_progress_at"], datetime):
            complaint["in_progress_at"] = complaint["in_progress_at"].isoformat() if complaint["in_progress_at"] else None
        if "resolved_at" in complaint and isinstance(complaint["resolved_at"], datetime):
            complaint["resolved_at"] = complaint["resolved_at"].isoformat() if complaint["resolved_at"] else None
        if "eta_updated_at" in complaint and isinstance(complaint["eta_updated_at"], datetime):
            complaint["eta_updated_at"] = complaint["eta_updated_at"].isoformat() if complaint["eta_updated_at"] else None
        # Convert timeline datetimes
        if "timeline" in complaint:
            for entry in complaint["timeline"]:
                if "timestamp" in entry and isinstance(entry["timestamp"], datetime):
                    entry["timestamp"] = entry["timestamp"].isoformat()
        
        # Add calculated SLA info
        from sla_helper import calculate_sla_status
        sla_info = calculate_sla_status(complaint)
        complaint["sla_info"] = sla_info
    return complaint

def get_complaints_by_user(user_id: str) -> List[dict]:
    """Get all complaints by a user"""
    try:
        complaints = ComplaintModel.find_by_user(user_id)
        # Convert datetime to ISO
        for complaint in complaints:
            if "created_at" in complaint and isinstance(complaint["created_at"], datetime):
                complaint["created_at"] = complaint["created_at"].isoformat()
            if "updated_at" in complaint and isinstance(complaint["updated_at"], datetime):
                complaint["updated_at"] = complaint["updated_at"].isoformat()
        return complaints
    except Exception as e:
        error_msg = str(e)
        if "ServerSelectionTimeoutError" in error_msg or "connection" in error_msg.lower():
            print(f"Warning: MongoDB connection failed: {error_msg}")
            return []
        raise

def get_complaints_by_ward(ward_number: int) -> List[dict]:
    """Get all complaints for a ward"""
    try:
        complaints = ComplaintModel.find_by_ward(ward_number)
        # Convert datetime to ISO
        for complaint in complaints:
            if "created_at" in complaint and isinstance(complaint["created_at"], datetime):
                complaint["created_at"] = complaint["created_at"].isoformat()
            if "updated_at" in complaint and isinstance(complaint["updated_at"], datetime):
                complaint["updated_at"] = complaint["updated_at"].isoformat()
        return complaints
    except Exception as e:
        error_msg = str(e)
        if "ServerSelectionTimeoutError" in error_msg or "connection" in error_msg.lower():
            print(f"Warning: MongoDB connection failed: {error_msg}")
            return []
        raise

def get_all_complaints(ward_number: Optional[int] = None, status: Optional[str] = None) -> List[dict]:
    """Get all complaints with optional filters"""
    try:
        filters = {}
        if ward_number:
            filters["ward_number"] = ward_number
        if status:
            filters["status"] = status
        
        complaints = ComplaintModel.find_all(filters)
        # Convert datetime to ISO
        for complaint in complaints:
            if "created_at" in complaint and isinstance(complaint["created_at"], datetime):
                complaint["created_at"] = complaint["created_at"].isoformat()
            if "updated_at" in complaint and isinstance(complaint["updated_at"], datetime):
                complaint["updated_at"] = complaint["updated_at"].isoformat()
        return complaints
    except Exception as e:
        error_msg = str(e)
        if "ServerSelectionTimeoutError" in error_msg or "connection" in error_msg.lower():
            print(f"Warning: MongoDB connection failed: {error_msg}")
            return []
        raise

def update_complaint_status(complaint_id: str, status: ComplaintStatus, remarks: str, updated_by: str) -> dict:
    """Update complaint status"""
    complaint = get_complaint_by_id(complaint_id)
    if not complaint:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    update_data = {"status": status.value}
    now = datetime.now()
    
    # Update SLA timestamps based on status
    if status == ComplaintStatus.ACKNOWLEDGED and not complaint.get("acknowledged_at"):
        update_data["acknowledged_at"] = now
    elif status == ComplaintStatus.IN_PROGRESS and not complaint.get("in_progress_at"):
        update_data["in_progress_at"] = now
    elif status == ComplaintStatus.RESOLVED and not complaint.get("resolved_at"):
        update_data["resolved_at"] = now
        
        # Calculate SLA status
        from sla_helper import calculate_sla_status
        sla_info = calculate_sla_status(complaint)
        update_data["sla_status"] = sla_info["sla_status"]
    
    ComplaintModel.update(complaint_id, update_data)
    ComplaintModel.add_timeline_entry(complaint_id, {
        "status": status.value,
        "remarks": remarks,
        "updated_by": updated_by
    })
    
    # Send notification to complaint owner
    create_complaint_status_notification(
        complaint_id,
        complaint["title"],
        status.value,
        complaint["created_by"]
    )
    
    return get_complaint_by_id(complaint_id)

def add_timeline_entry(complaint_id: str, entry: dict) -> dict:
    """Add timeline entry to complaint"""
    complaint = get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    ComplaintModel.add_timeline_entry(complaint_id, entry)
    return get_complaint_by_id(complaint_id)

def set_complaint_eta(complaint_id: str, eta_hours: float, updated_by: str, comment: Optional[str] = None) -> dict:
    """Set estimated resolution time for a complaint"""
    complaint = get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    now = datetime.now()
    ComplaintModel.update(complaint_id, {
        "eta_hours": float(eta_hours),
        "eta_updated_at": now
    })

    remarks = comment.strip() if isinstance(comment, str) and comment.strip() else f"ETA set to {eta_hours} hours"
    ComplaintModel.add_timeline_entry(complaint_id, {
        "status": "eta_update",
        "remarks": remarks,
        "updated_by": updated_by
    })

    return get_complaint_by_id(complaint_id)

def resolve_complaint(complaint_id: str, resolution: str, resolved_by: str) -> dict:
    """Resolve a complaint"""
    complaint = get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Calculate response time
    created_at = datetime.fromisoformat(complaint["created_at"]) if isinstance(complaint.get("created_at"), str) else complaint.get("created_at", datetime.now())
    resolved_at = datetime.now()
    response_time = (resolved_at - created_at).total_seconds() / 3600
    
    ComplaintModel.update(complaint_id, {
        "status": ComplaintStatus.RESOLVED.value,
        "resolution": resolution,
        "response_time_hours": round(response_time, 2)
    })
    
    ComplaintModel.add_timeline_entry(complaint_id, {
        "status": ComplaintStatus.RESOLVED.value,
        "remarks": f"Resolved: {resolution}",
        "updated_by": resolved_by
    })
    
    # Send notification
    create_complaint_status_notification(
        complaint_id,
        complaint["title"],
        ComplaintStatus.RESOLVED.value,
        complaint["created_by"]
    )
    
    return get_complaint_by_id(complaint_id)

def rate_complaint(complaint_id: str, rating: int, feedback: Optional[str], user_id: str) -> dict:
    """Rate a complaint"""
    complaint = get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if complaint["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Only the complainant can rate")
    
    if complaint["status"] != ComplaintStatus.RESOLVED.value:
        raise HTTPException(status_code=400, detail="Can only rate resolved complaints")
    
    ComplaintModel.update(complaint_id, {
        "rating": rating,
        "feedback": feedback
    })
    
    return get_complaint_by_id(complaint_id)

def assign_complaint(complaint_id: str, officer_id: str, assigned_by: str) -> dict:
    """Assign complaint to officer"""
    complaint = get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    ComplaintModel.update(complaint_id, {"assigned_officer_id": officer_id})
    ComplaintModel.add_timeline_entry(complaint_id, {
        "status": complaint.get("status", ComplaintStatus.PENDING.value),
        "remarks": f"Assigned to officer {officer_id}",
        "updated_by": assigned_by
    })
    
    return get_complaint_by_id(complaint_id)

def track_complaint(complaint_id: str) -> Optional[dict]:
    """Track complaint (public endpoint)"""
    return get_complaint_by_id(complaint_id)
