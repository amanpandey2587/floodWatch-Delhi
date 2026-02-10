from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str
    ward_number: Optional[int] = None
    role: Literal["citizen", "ward_officer", "admin"] = "citizen"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    ward_number: Optional[int] = None
    is_verified: bool = False
    is_active: bool = True
    created_at: Optional[str] = None

class TokenData(BaseModel):
    user_id: str
    email: str
    role: str
