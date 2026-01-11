from models import NotificationModel, UserModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

# FCM V1 API Setup (using Service Account)
FCM_SERVICE_ACCOUNT_PATH = os.getenv("FCM_SERVICE_ACCOUNT_PATH", "")
FCM_PROJECT_ID = os.getenv("FCM_PROJECT_ID", "")
fcm_credentials = None

if FCM_SERVICE_ACCOUNT_PATH and os.path.exists(FCM_SERVICE_ACCOUNT_PATH):
    try:
        fcm_credentials = service_account.Credentials.from_service_account_file(
            FCM_SERVICE_ACCOUNT_PATH,
            scopes=['https://www.googleapis.com/auth/firebase.messaging']
        )
        fcm_credentials.refresh(Request())
        print(f"[Notifications] FCM credentials loaded")
    except Exception as e:
        print(f"[Notifications] Error initializing FCM: {e}")
        fcm_credentials = None
else:
    print(f"[Notifications] FCM_SERVICE_ACCOUNT_PATH not set. Push notifications disabled.")

def create_notification_for_ward_admin(ward_number: int, complaint_id: str, complaint_title: str):
    """Create notification for ward admin when new complaint is filed"""
    notification = {
        "type": "new_complaint",
        "title": "New Complaint Filed",
        "message": f"New complaint in Ward {ward_number}: {complaint_title}",
        "ward_number": ward_number,
        "complaint_id": complaint_id,
        "created_by": "system",
        "created_at": datetime.now()
    }
    NotificationModel.create(notification)
    
    # Send push notification to ward admin
    ward_admins = UserModel.find_by_ward(ward_number)
    for admin in ward_admins:
        if admin.get("push_token") and admin.get("role") == "ward_admin":
            send_push_notification(
                admin["push_token"],
                notification["title"],
                notification["message"],
                {"complaint_id": complaint_id, "type": "new_complaint"}
            )

def create_complaint_status_notification(complaint_id: str, complaint_title: str, status: str, user_id: str):
    """Create notification when complaint status changes"""
    notification = {
        "type": "complaint_update",
        "title": f"Complaint Status Updated",
        "message": f"Your complaint '{complaint_title}' is now {status.replace('_', ' ')}",
        "complaint_id": complaint_id,
        "user_id": user_id,
        "created_by": "system"
    }
    NotificationModel.create(notification)
    
    # Send push notification
    user = UserModel.find_by_id(user_id)
    if user and user.get("push_token"):
        send_push_notification(
            user["push_token"],
            notification["title"],
            notification["message"],
            {"complaint_id": complaint_id, "type": "complaint_update", "status": status}
        )

def create_ward_broadcast(ward_number: int, title: str, message: str, broadcast_by: str) -> str:
    """Create ward-wide broadcast notification"""
    print(f"[Notification] Creating ward broadcast for ward {ward_number}")
    print(f"[Notification] Title: {title}")
    print(f"[Notification] Message: {message[:50]}...")
    print(f"[Notification] Created by: {broadcast_by}")
    
    notification = {
        "type": "ward_broadcast",
        "title": title,
        "message": message,
        "ward_number": ward_number,
        "created_by": broadcast_by,
        "broadcast_at": datetime.now()
    }
    
    try:
        print(f"[Notification] Saving to MongoDB...")
        notification_id = NotificationModel.create(notification)
        print(f"[Notification] SUCCESS: Notification saved with ID: {notification_id}")
    except Exception as e:
        print(f"[Notification] ERROR: Failed to save notification: {type(e).__name__}: {str(e)}")
        raise
    
    # Send push notifications to all users in ward
    try:
        print(f"[Notification] Finding users in ward {ward_number}...")
        ward_users = UserModel.find_by_ward(ward_number)
        print(f"[Notification] Found {len(ward_users)} users in ward {ward_number}")
        
        push_sent = 0
        for user in ward_users:
            if user.get("push_token"):
                print(f"[Notification] Sending push to user {user.get('user_id')}...")
                send_push_notification(
                    user["push_token"],
                    title,
                    message,
                    {"type": "ward_broadcast", "ward_number": ward_number, "notification_id": notification_id}
                )
                push_sent += 1
        
        print(f"[Notification] SUCCESS: Sent {push_sent} push notifications")
    except Exception as e:
        print(f"[Notification] WARNING: Error sending push notifications: {type(e).__name__}: {str(e)}")
    
    return notification_id

def send_push_notification(push_token: str, title: str, message: str, data: Optional[Dict[str, Any]] = None):
    """Send push notification via FCM V1 API"""
    if not fcm_credentials or not FCM_PROJECT_ID or not push_token:
        print(f"[Notifications] Push notification skipped: FCM not configured or no push token")
        return False
    
    try:
        fcm_credentials.refresh(Request())
        access_token = fcm_credentials.token
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "message": {
                "token": push_token,
                "notification": {
                    "title": title,
                    "body": message
                },
                "data": {str(k): str(v) for k, v in (data or {}).items()}
            }
        }
        
        response = requests.post(
            f"https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send",
            headers=headers,
            json=payload,
            timeout=10
        )
        response.raise_for_status()
        print(f"[Notifications] Push notification sent successfully")
        return True
    except Exception as e:
        print(f"[Notifications] Error sending push notification: {type(e).__name__}: {str(e)}")
        return False

def get_user_notifications(user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
    """Get notifications for a user"""
    notifications = NotificationModel.find_by_user(user_id, unread_only)
    for n in notifications:
        if "created_at" in n and isinstance(n["created_at"], datetime):
            n["created_at"] = n["created_at"].isoformat()
    return notifications

def get_ward_notifications(ward_number: int) -> List[Dict[str, Any]]:
    """Get notifications for a ward"""
    notifications = NotificationModel.find_by_ward(ward_number)
    for n in notifications:
        if "created_at" in n and isinstance(n["created_at"], datetime):
            n["created_at"] = n["created_at"].isoformat()
    return notifications
