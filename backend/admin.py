from models import complaints_collection
from complaints_db import get_complaints_by_ward, get_all_complaints
from typing import List, Dict, Any, Optional
from datetime import datetime

def get_admin_dashboard_stats(ward_number: Optional[int] = None) -> Dict[str, Any]:
    """Get admin dashboard statistics"""
    try:
        if ward_number:
            all_complaints = get_complaints_by_ward(ward_number)
        else:
            all_complaints = get_all_complaints()
    except Exception as e:
        error_msg = str(e)
        if "ServerSelectionTimeoutError" in error_msg or "connection" in error_msg.lower():
            print(f"Warning: MongoDB connection failed: {error_msg}")
            all_complaints = []
        else:
            raise
    
    stats = {
        "total_complaints": len(all_complaints),
        "pending": len([c for c in all_complaints if c.get("status") == "pending"]),
        "acknowledged": len([c for c in all_complaints if c.get("status") == "acknowledged"]),
        "in_progress": len([c for c in all_complaints if c.get("status") == "in_progress"]),
        "resolved": len([c for c in all_complaints if c.get("status") == "resolved"]),
        "high_priority": len([c for c in all_complaints if c.get("priority") in ["high", "urgent"]]),
        "avg_response_time": None,
        "satisfaction_rate": None,
    }
    
    # Calculate average response time
    resolved_complaints = [c for c in all_complaints if c.get("status") == "resolved" and c.get("response_time_hours")]
    if resolved_complaints:
        avg_time = sum(c.get("response_time_hours", 0) for c in resolved_complaints) / len(resolved_complaints)
        stats["avg_response_time"] = round(avg_time, 2)
    
    # Calculate satisfaction rate (ratings >= 4)
    rated_complaints = [c for c in all_complaints if c.get("rating")]
    if rated_complaints:
        satisfied = len([c for c in rated_complaints if c.get("rating", 0) >= 4])
        stats["satisfaction_rate"] = round((satisfied / len(rated_complaints)) * 100, 1)
    
    return stats

def get_recent_complaints(ward_number: Optional[int] = None, limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent complaints for admin dashboard"""
    if ward_number:
        complaints = get_complaints_by_ward(ward_number)
    else:
        complaints = get_all_complaints()
    
    # Sort by created_at descending and limit
    sorted_complaints = sorted(complaints, key=lambda x: x.get("created_at", datetime.min) if isinstance(x.get("created_at"), datetime) else datetime.min, reverse=True)
    
    # Convert datetime to ISO string for response
    result = []
    for complaint in sorted_complaints[:limit]:
        complaint_dict = dict(complaint) if not isinstance(complaint, dict) else complaint
        if "created_at" in complaint_dict and isinstance(complaint_dict["created_at"], datetime):
            complaint_dict["created_at"] = complaint_dict["created_at"].isoformat()
        if "updated_at" in complaint_dict and isinstance(complaint_dict["updated_at"], datetime):
            complaint_dict["updated_at"] = complaint_dict["updated_at"].isoformat()
        result.append(complaint_dict)
    
    return result
