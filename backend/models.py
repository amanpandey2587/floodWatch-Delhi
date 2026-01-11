from pymongo import MongoClient
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB Connection
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "floodwatch_delhi")

print(f"[MongoDB] Connecting to: {MONGO_URI}")
print(f"[MongoDB] Database name: {DATABASE_NAME}")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)  # 5 second timeout
    # Test connection
    client.admin.command('ping')
    print(f"[MongoDB] Connection successful!")
except Exception as e:
    print(f"[MongoDB] Connection failed: {e}")
    print(f"[MongoDB] WARNING: Continuing with client (will fail on first query)")
    client = MongoClient(MONGO_URI)

db = client[DATABASE_NAME]

# Collections
complaints_collection = db["complaints"]
notifications_collection = db["notifications"]
users_collection = db["users"]

print(f"[MongoDB] Collections initialized: complaints, notifications, users")

class ComplaintModel:
    @staticmethod
    def create(complaint_data: Dict[str, Any]) -> str:
        """Create a new complaint"""
        complaint_data["created_at"] = datetime.now()
        complaint_data["updated_at"] = datetime.now()
        result = complaints_collection.insert_one(complaint_data)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_id(complaint_id: str) -> Optional[Dict[str, Any]]:
        """Find complaint by ID"""
        complaint = complaints_collection.find_one({"complaint_id": complaint_id})
        if complaint:
            complaint["_id"] = str(complaint["_id"])
        return complaint
    
    @staticmethod
    def find_by_user(user_id: str) -> List[Dict[str, Any]]:
        """Find all complaints by user"""
        complaints = list(complaints_collection.find({"created_by": user_id}).sort("created_at", -1))
        for complaint in complaints:
            complaint["_id"] = str(complaint["_id"])
        return complaints
    
    @staticmethod
    def find_by_ward(ward_number: int) -> List[Dict[str, Any]]:
        """Find all complaints by ward"""
        complaints = list(complaints_collection.find({"ward_number": ward_number}).sort("created_at", -1))
        for complaint in complaints:
            complaint["_id"] = str(complaint["_id"])
        return complaints
    
    @staticmethod
    def update(complaint_id: str, update_data: Dict[str, Any]) -> bool:
        """Update complaint"""
        update_data["updated_at"] = datetime.now()
        result = complaints_collection.update_one(
            {"complaint_id": complaint_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    @staticmethod
    def add_timeline_entry(complaint_id: str, timeline_entry: Dict[str, Any]) -> bool:
        """Add timeline entry to complaint"""
        timeline_entry["timestamp"] = datetime.now()
        result = complaints_collection.update_one(
            {"complaint_id": complaint_id},
            {"$push": {"timeline": timeline_entry}, "$set": {"updated_at": datetime.now()}}
        )
        return result.modified_count > 0
    
    @staticmethod
    def find_all(filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Find all complaints with optional filters"""
        query = filters or {}
        complaints = list(complaints_collection.find(query).sort("created_at", -1))
        for complaint in complaints:
            complaint["_id"] = str(complaint["_id"])
        return complaints

class NotificationModel:
    @staticmethod
    def create(notification_data: Dict[str, Any]) -> str:
        """Create a new notification"""
        print(f"[NotificationModel] Creating notification: {notification_data.get('type')}")
        print(f"[NotificationModel] Collection: {notifications_collection.name}")
        
        notification_data["created_at"] = datetime.now()
        notification_data["read"] = False
        try:
            result = notifications_collection.insert_one(notification_data)
            notification_id = str(result.inserted_id)
            print(f"[NotificationModel] SUCCESS: Notification created with ID: {notification_id}")
            return notification_id
        except Exception as e:
            print(f"[NotificationModel] ERROR: Failed to create notification: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    @staticmethod
    def find_by_user(user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Find notifications by user"""
        query = {"user_id": user_id}
        if unread_only:
            query["read"] = False
        notifications = list(notifications_collection.find(query).sort("created_at", -1))
        for notification in notifications:
            notification["_id"] = str(notification["_id"])
        return notifications
    
    @staticmethod
    def find_by_ward(ward_number: int) -> List[Dict[str, Any]]:
        """Find notifications for a ward"""
        notifications = list(notifications_collection.find({
            "ward_number": ward_number,
            "type": "ward_broadcast"
        }).sort("created_at", -1))
        for notification in notifications:
            notification["_id"] = str(notification["_id"])
        return notifications
    
    @staticmethod
    def mark_as_read(notification_id: str) -> bool:
        """Mark notification as read"""
        try:
            result = notifications_collection.update_one(
                {"_id": ObjectId(notification_id)},
                {"$set": {"read": True, "read_at": datetime.now()}}
            )
            return result.modified_count > 0
        except (InvalidId, TypeError):
            return False
    
    @staticmethod
    def mark_all_as_read(user_id: str) -> int:
        """Mark all notifications as read for user"""
        result = notifications_collection.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True, "read_at": datetime.now()}}
        )
        return result.modified_count

class UserModel:
    @staticmethod
    def create_or_update(user_data: Dict[str, Any]) -> str:
        """Create or update user"""
        user_id = user_data.get("user_id")
        if not user_id:
            raise ValueError("user_id is required")
        
        # Set defaults
        update_data = {
            **user_data,
            "updated_at": datetime.now(),
        }
        
        # Set created_at only on insert
        existing_user = users_collection.find_one({"user_id": user_id})
        if not existing_user and "created_at" not in update_data:
            update_data["created_at"] = datetime.now()
        
        result = users_collection.update_one(
            {"user_id": user_id},
            {"$set": update_data},
            upsert=True
        )
        
        if result.upserted_id:
            return str(result.upserted_id)
        user = users_collection.find_one({"user_id": user_id})
        return str(user["_id"])
    
    @staticmethod
    def find_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Find user by ID"""
        print(f"[UserModel] Finding user by ID: {user_id}")
        try:
            user = users_collection.find_one({"user_id": user_id})
            if user:
                user["_id"] = str(user["_id"])
                print(f"[UserModel] SUCCESS: User found - email: {user.get('email', 'N/A')}, role: {user.get('role', 'N/A')}, ward: {user.get('ward_number', 'N/A')}")
            else:
                print(f"[UserModel] WARNING: User not found with ID: {user_id}")
            return user
        except Exception as e:
            print(f"[UserModel] ERROR: Error finding user: {type(e).__name__}: {str(e)}")
            raise
    
    @staticmethod
    def find_by_ward(ward_number: int) -> List[Dict[str, Any]]:
        """Find users by ward"""
        print(f"[UserModel] Finding users in ward: {ward_number}")
        try:
            users = list(users_collection.find({"ward_number": ward_number}))
            print(f"[UserModel] SUCCESS: Found {len(users)} users in ward {ward_number}")
            for user in users:
                user["_id"] = str(user["_id"])
            return users
        except Exception as e:
            print(f"[UserModel] ERROR: Error finding users by ward: {type(e).__name__}: {str(e)}")
            raise
    
    @staticmethod
    def update_push_token(user_id: str, push_token: str, platform: str) -> bool:
        """Update user push notification token"""
        result = users_collection.update_one(
            {"user_id": user_id},
            {"$set": {
                "push_token": push_token,
                "platform": platform,
                "updated_at": datetime.now()
            }}
        )
        return result.modified_count > 0
