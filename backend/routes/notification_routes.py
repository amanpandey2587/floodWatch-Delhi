from fastapi import APIRouter, Header, Query
from controllers.notification_controller import NotificationController

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.post("/broadcast")
async def broadcast_notification(
    notification_data: dict,
    broadcast_by: str = Header(..., alias="X-User-ID")
):
    """Create ward-wide broadcast notification"""
    return NotificationController.broadcast_notification(notification_data, broadcast_by)

@router.get("")
async def get_notifications(
    user_id: str = Header(..., alias="X-User-ID"),
    unread_only: bool = Query(False)
):
    """Get notifications for user"""
    return NotificationController.get_notifications(user_id, unread_only)

@router.get("/ward/{ward_number}")
async def get_ward_notifications(ward_number: int):
    """Get ward broadcast notifications"""
    return NotificationController.get_ward_notifications(ward_number)

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Mark notification as read"""
    return NotificationController.mark_read(notification_id)

@router.put("/read-all")
async def mark_all_notifications_read(
    user_id: str = Header(..., alias="X-User-ID")
):
    """Mark all notifications as read for user"""
    return NotificationController.mark_all_read(user_id)
