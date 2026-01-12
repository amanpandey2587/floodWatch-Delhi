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
import uuid

def file_complaint(complaint_data: ComplaintCreate, user_id: str) -> dict:
    """File a new complaint"""
    complaint_id = f"COMP-{uuid.uuid4().hex[:8].upper()}"
    
    # Convert location to dict if it's a Pydantic model
    location_dict = None
    if complaint_data.location:
        if hasattr(complaint_data.location, 'model_dump'):
            location_dict = complaint_data.location.model_dump()  # Pydantic v2
        elif hasattr(complaint_data.location, 'dict'):
            location_dict = complaint_data.location.dict()  # Pydantic v1
        else:
            location_dict = complaint_data.location  # Already a dict
    
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
        "timeline": [{
            "timestamp": now,  # Keep as datetime for MongoDB
            "status": ComplaintStatus.PENDING.value,
            "remarks": "Complaint filed",
            "updated_by": user_id
        }],
        "response_time_hours": None,
        "resolution": None,
        "rating": None,
        "feedback": None,
        "created_at": now,  # Keep as datetime for MongoDB
        "updated_at": now   # Keep as datetime for MongoDB
    }
    
    # Save to MongoDB (this adds the datetime objects)
    ComplaintModel.create(complaint)
    
    # Auto-assign to ward officer
    auto_assign_complaint(complaint_id, complaint_data.ward_number)
    
    # Create notification for ward admin
    create_notification_for_ward_admin(complaint_data.ward_number, complaint_id, complaint_data.title)
    
    # NOW get the complaint back and convert datetimes for response
    saved_complaint = get_complaint_by_id(complaint_id)
    
    return saved_complaint  # This already has ISO formatted dates

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
        # Convert timeline datetimes
        if "timeline" in complaint:
            for entry in complaint["timeline"]:
                if "timestamp" in entry and isinstance(entry["timestamp"], datetime):
                    entry["timestamp"] = entry["timestamp"].isoformat()
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
    
    ComplaintModel.update(complaint_id, {"status": status.value})
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
