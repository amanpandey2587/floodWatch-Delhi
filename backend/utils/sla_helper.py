from datetime import datetime, timedelta
from typing import Optional, Literal

def calculate_sla_status(complaint: dict, target_hours: int = 24) -> dict:
    """
    Calculate SLA status for a complaint based on timestamps
    
    Returns:
        dict with sla_status, elapsed_hours, remaining_hours, sla_percentage
    """
    reported_at = complaint.get("created_at")
    resolved_at = complaint.get("resolved_at")
    
    if not reported_at:
        return {
            "sla_status": "unknown",
            "elapsed_hours": 0,
            "remaining_hours": target_hours,
            "sla_percentage": 0
        }
    
    # If resolved, use resolved_at, otherwise use current time 
    end_time = resolved_at if resolved_at else datetime.now()
    
    # Calculate elapsed time
    if isinstance(reported_at, str):
        reported_at = datetime.fromisoformat(reported_at.replace('Z', '+00:00'))
    if isinstance(end_time, str):
        end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    
    elapsed = end_time - reported_at
    elapsed_hours = elapsed.total_seconds() / 3600
    remaining_hours = max(0, target_hours - elapsed_hours)
    sla_percentage = min(100, (elapsed_hours / target_hours) * 100)
    
    # Determine SLA status
    if resolved_at:
        # Complaint is resolved
        sla_status = "met" if elapsed_hours <= target_hours else "breached"
    elif sla_percentage < 50:
        sla_status = "within_sla"  # Green
    elif sla_percentage < 100:
        sla_status = "approaching_sla"  # Yellow
    else:
        sla_status = "sla_breached"  # Red
    
    return {
        "sla_status": sla_status,
        "elapsed_hours": round(elapsed_hours, 1),
        "remaining_hours": round(remaining_hours, 1),
        "sla_percentage": round(sla_percentage, 1),
        "target_hours": target_hours
    }

def get_sla_color(sla_status: str) -> str:
    """Get color code for SLA status"""
    colors = {
        "within_sla": "#22c55e",  # Green
        "approaching_sla": "#eab308",  # Yellow
        "sla_breached": "#ef4444",  # Red
        "met": "#22c55e",  # Green
        "breached": "#ef4444",  # Red
        "unknown": "#6b7280"  # Gray
    }
    return colors.get(sla_status, "#6b7280")
