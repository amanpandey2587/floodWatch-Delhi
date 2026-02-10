from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from complaints_db import (
    file_complaint, assign_complaint, update_complaint_status,
    add_timeline_entry, resolve_complaint, rate_complaint,
    get_complaints_by_user, get_complaints_by_ward, track_complaint,
    get_all_complaints, set_complaint_eta
)

class ComplaintController:
    @staticmethod
    def create_complaint(complaint: dict, user_id: str):
        try:
            effective_user_id = user_id or "anonymous-user"
            result = file_complaint(complaint, effective_user_id)
            result = jsonable_encoder(result)
            return result
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def list_complaints(user_id: str, role: str, ward_number: int, status: str):
        try:
            role_norm = str(role or "").strip().lower()
            if role_norm in ["ward_admin", "ward_officer", "admin"] and ward_number:
                complaints = get_complaints_by_ward(ward_number)
            elif role_norm in ["ward_admin", "ward_officer", "admin"]:
                complaints = get_all_complaints(ward_number=ward_number, status=status)
            elif user_id:
                complaints = get_complaints_by_user(user_id)
            else:
                complaints = get_all_complaints(ward_number=ward_number, status=status)
            
            return {"complaints": complaints, "count": len(complaints)}
        except Exception as e:
            error_msg = str(e)
            if "ServerSelectionTimeoutError" in error_msg or "connection" in error_msg.lower():
                raise HTTPException(
                    status_code=503,
                    detail="Database connection failed. Please ensure MongoDB is running or check your MONGODB_URI in .env file."
                )
            raise HTTPException(status_code=500, detail=f"Error fetching complaints: {error_msg}")

    @staticmethod
    def get_complaint(complaint_id: str):
        complaint = track_complaint(complaint_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return complaint

    @staticmethod
    def assign_complaint(complaint_id: str, officer_id: str, assigned_by: str):
        try:
            result = assign_complaint(complaint_id, officer_id, assigned_by)
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def update_status(complaint_id: str, update: dict, updated_by: str):
        try:
            if update.status:
                result = update_complaint_status(
                    complaint_id, 
                    update.status, 
                    update.remarks or "Status updated",
                    updated_by
                )
            else:
                raise HTTPException(status_code=400, detail="Status is required")
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def add_timeline(complaint_id: str, entry: dict, updated_by: str):
        try:
            entry["updated_by"] = updated_by
            result = add_timeline_entry(complaint_id, entry)
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def resolve_complaint(complaint_id: str, resolution_data: dict, resolved_by: str):
        try:
            resolution = resolution_data.get("resolution", "")
            if not resolution:
                raise HTTPException(status_code=400, detail="Resolution is required")
            result = resolve_complaint(complaint_id, resolution, resolved_by)
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def rate_complaint(complaint_id: str, rating_data: dict, user_id: str):
        try:
            result = rate_complaint(
                complaint_id, 
                rating_data.rating, 
                rating_data.feedback,
                user_id
            )
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def set_eta(complaint_id: str, eta_data: dict, updated_by: str):
        try:
            eta_hours = eta_data.get("eta_hours")
            if eta_hours is None:
                raise HTTPException(status_code=400, detail="eta_hours is required")
            comment = eta_data.get("comment")
            result = set_complaint_eta(complaint_id, eta_hours, updated_by, comment)
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
