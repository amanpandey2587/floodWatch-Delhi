from fastapi import HTTPException, status
from models import UserModel
from auth.schemas import UserRegister, UserLogin, Token, UserResponse
from auth.dependencies import create_access_token
from datetime import timedelta

class AuthController:
    @staticmethod
    def register(user_data: UserRegister):
        """Register new user"""
        try:
            # Hash password
            password_hash = UserModel.hash_password(user_data.password)
            
            # Create user
            user_id = UserModel.create_user(
                email=user_data.email,
                password_hash=password_hash,
                name=user_data.name,
                role=user_data.role,
                ward_number=user_data.ward_number
            )
            
            # Get user from database
            user = UserModel.find_by_id(user_id)
            
            # Create access token
            access_token = create_access_token(
                data={"sub": user_id, "email": user_data.email, "role": user_data.role}
            )
            
            # Prepare user response
            user_response = UserResponse(
                user_id=user["user_id"],
                email=user["email"],
                name=user["name"],
                role=user["role"],
                ward_number=user.get("ward_number"),
                is_verified=user.get("is_verified", False),
                is_active=user.get("is_active", True),
                created_at=str(user.get("created_at"))
            )
            
            return Token(
                access_token=access_token,
                token_type="bearer",
                user=user_response
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {str(e)}"
            )
    
    @staticmethod
    def login(credentials: UserLogin):
        """Login user"""
        try:
            # Find user by email
            user = UserModel.find_by_email(credentials.email)
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            # Verify password
            if not UserModel.verify_password(credentials.password, user["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            # Check if user is active
            if not user.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is inactive"
                )
            
            # Create access token
            access_token = create_access_token(
                data={
                    "sub": user["user_id"],
                    "email": user["email"],
                    "role": user.get("role", "citizen")
                }
            )
            
            # Prepare user response
            user_response = UserResponse(
                user_id=user["user_id"],
                email=user["email"],
                name=user["name"],
                role=user.get("role", "citizen"),
                ward_number=user.get("ward_number"),
                is_verified=user.get("is_verified", False),
                is_active=user.get("is_active", True),
                created_at=str(user.get("created_at"))
            )
            
            return Token(
                access_token=access_token,
                token_type="bearer",
                user=user_response
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Login failed: {str(e)}"
            )
    
    @staticmethod
    def get_me(current_user: dict):
        """Get current user profile"""
        try:
            return UserResponse(
                user_id=current_user["user_id"],
                email=current_user["email"],
                name=current_user["name"],
                role=current_user.get("role", "citizen"),
                ward_number=current_user.get("ward_number"),
                is_verified=current_user.get("is_verified", False),
                is_active=current_user.get("is_active", True),
                created_at=str(current_user.get("created_at"))
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
    
    @staticmethod
    def register_push_token(token_data: dict, user_id: str):
        """Legacy endpoint - register push token"""
        try:
            push_token = token_data.get("push_token")
            platform = token_data.get("platform")
            success = UserModel.update_push_token(user_id, push_token, platform)
            return {"success": success}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
