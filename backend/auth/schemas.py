from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Literal
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: Optional[str] = None
    ward_number: Optional[int] = None
    role: Literal["citizen", "ward_officer", "admin", "ward_admin"] = "citizen"

    @validator("name", pre=True, always=True)
    def normalize_name(cls, value: Optional[str]):
        if value is None:
            return "Citizen"
        cleaned = str(value).strip()
        return cleaned if cleaned else "Citizen"

    @validator("role", pre=True, always=True)
    def normalize_role(cls, value: str):
        if not value:
            return "citizen"
        role = str(value).strip().lower()
        if role == "ward_admin":
            return "admin"
        return role

    @validator("password", pre=True, always=True)
    def normalize_password(cls, value: str):
        if value is None:
            return value
        text = str(value)
        # bcrypt only considers first 72 bytes; truncate to avoid backend error
        if len(text.encode("utf-8")) > 72:
            truncated = text.encode("utf-8")[:72].decode("utf-8", errors="ignore")
            return truncated
        return text

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
