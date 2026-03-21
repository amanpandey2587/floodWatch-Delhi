from fastapi import HTTPException
from utils.notifications import create_ward_broadcast, get_user_notifications, get_ward_notifications
from models import NotificationModel

class NotificationController:
    @staticmethod
    def broadcast_notification(notification_data: dict, broadcast_by: str):
        try:
            ward_number = notification_data.get("ward_number")
            title = notification_data.get("title")
            message = notification_data.get("message")
            notification_id = create_ward_broadcast(ward_number, title, message, broadcast_by)
            return {"success": True, "notification_id": notification_id}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def get_notifications(user_id: str, unread_only: bool):
        try:
            notifications = get_user_notifications(user_id, unread_only)
            return {"notifications": notifications, "count": len(notifications)}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def get_ward_notifications(ward_number: int):
        try:
            notifications = get_ward_notifications(ward_number)
            return {"notifications": notifications, "count": len(notifications)}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def mark_read(notification_id: str):
        try:
            success = NotificationModel.mark_as_read(notification_id)
            if not success:
                raise HTTPException(status_code=404, detail="Notification not found")
            return {"success": True}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def mark_all_read(user_id: str):
        try:
            count = NotificationModel.mark_all_as_read(user_id)
            return {"success": True, "marked_count": count}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
