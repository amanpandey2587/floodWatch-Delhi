from fastapi import APIRouter, Query, Depends
from typing import Optional
from controllers.admin_controller import AdminController
from auth.dependencies import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/dashboard")
async def get_admin_dashboard(
    ward_number: Optional[int] = Query(None),
    current_user: dict = Depends(require_admin)
):
    """Get admin dashboard statistics (admin only)"""
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    return AdminController.get_dashboard(ward_number, role, user_id)

@router.post("/broadcast")
async def admin_broadcast(
    broadcast_data: dict,
    current_user: dict = Depends(require_admin)
):
    """Admin broadcast notification to ward (admin only)"""
    user_id = current_user.get("user_id")
    role = current_user.get("role")
    return AdminController.broadcast(broadcast_data, user_id, role)
