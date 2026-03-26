from fastapi import HTTPException
from models import UserModel
from utils.admin import get_admin_dashboard_stats, get_recent_complaints
from utils.notifications import create_ward_broadcast

class AdminController:
    @staticmethod
    def get_dashboard(ward_number: int, role: str, user_id: str):
        role_norm = str(role or "").strip().lower()
        if role_norm not in ["ward_admin", "admin", "ward_officer", "ward"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        try:
            if role_norm in ["ward_admin", "ward_officer", "ward"] and not ward_number:
                user = UserModel.find_by_id(user_id)
                if user and user.get("ward_number"):
                    ward_number = user.get("ward_number")
            
            stats = get_admin_dashboard_stats(ward_number)
            recent_complaints = get_recent_complaints(ward_number, limit=10)
            
            return {
                "stats": stats,
                "recent_complaints": recent_complaints
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def broadcast(broadcast_data: dict, user_id: str, role: str):
        print(f"[Admin Broadcast] Received request from user_id: {user_id}, role: {role}")
        print(f"[Admin Broadcast] Request data: {broadcast_data}")
        
        role_norm = str(role or "").strip().lower()
        if role_norm not in ["ward_admin", "admin", "ward_officer", "ward"]:
            print(f"[Admin Broadcast] ERROR: Access denied - Invalid role: {role}")
            raise HTTPException(status_code=403, detail="Admin access required")
        
        try:
            ward_number = broadcast_data.get("ward_number")
            title = broadcast_data.get("title")
            message = broadcast_data.get("message")
            
            print(f"[Admin Broadcast] Ward: {ward_number}, Title: {title}")
            
            if role_norm in ["ward_admin", "ward_officer", "ward"]:
                print(f"[Admin Broadcast] Checking ward_admin permissions...")
                user = UserModel.find_by_id(user_id)
                print(f"[Admin Broadcast] User from DB: {user}")
                if user:
                    user_ward = user.get("ward_number")
                    print(f"[Admin Broadcast] User ward: {user_ward}, Request ward: {ward_number}")
                    if user_ward != ward_number:
                        print(f"[Admin Broadcast] ERROR: Ward mismatch - User ward: {user_ward}, Request ward: {ward_number}")
                        raise HTTPException(status_code=403, detail="Can only broadcast to your assigned ward")
                else:
                    print(f"[Admin Broadcast] WARNING: User not found in DB, allowing request")
            
            print(f"[Admin Broadcast] Creating ward broadcast...")
            create_ward_broadcast(ward_number, title, message, user_id)
            print(f"[Admin Broadcast] SUCCESS: Notification created successfully!")
            return {"success": True}
        except HTTPException as he:
            print(f"[Admin Broadcast] HTTPException: {he.detail}")
            raise
        except Exception as e:
            print(f"[Admin Broadcast] ERROR: Exception: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=400, detail=str(e))
