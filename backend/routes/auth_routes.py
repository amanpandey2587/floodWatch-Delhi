from fastapi import APIRouter, Depends
from controllers.auth_controller import AuthController
from auth.schemas import UserRegister, UserLogin, Token, UserResponse
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user"""
    try:
        data = user_data.dict()
    except Exception:
        data = {"error": "failed to serialize user_data"}
    if "password" in data:
        data["password"] = "***"
    print(f"[Auth] register -> payload: {data}")
    return AuthController.register(user_data)

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    try:
        data = credentials.dict()
    except Exception:
        data = {"error": "failed to serialize credentials"}
    if "password" in data:
        data["password"] = "***"
    print(f"[Auth] login -> payload: {data}")
    return AuthController.login(credentials)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return AuthController.get_me(current_user)

@router.post("/logout")
async def logout():
    """Logout (client-side token clearing)"""
    return {"message": "Logged out successfully"}
