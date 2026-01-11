from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class ComplaintStatus(str, Enum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class ComplaintPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    category: str = Field(..., min_length=3, max_length=50)
    ward_number: int = Field(..., ge=1, le=272)
    location: Optional[Dict[str, float]] = None
    priority: ComplaintPriority = ComplaintPriority.MEDIUM
    attachments: Optional[List[str]] = []  # Base64 encoded images

class ComplaintUpdate(BaseModel):
    status: Optional[ComplaintStatus] = None
    remarks: Optional[str] = None
    assigned_officer_id: Optional[str] = None

class ComplaintRating(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None
