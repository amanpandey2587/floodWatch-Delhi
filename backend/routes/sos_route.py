from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator
from auth.dependencies import get_current_user
from sos_service import broadcast_sos

router = APIRouter(prefix="/sos", tags=["SOS"])


class SOSBroadcastRequest(BaseModel):
    ward_id: str
    message: str

    @validator("message")
    def message_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 300:
            raise ValueError("Message too long (max 300 chars)")
        return v

    @validator("ward_id")
    def valid_ward(cls, v):
        if not v or not v.strip():
            raise ValueError("Ward ID required")
        return v.strip()


@router.post("/broadcast")
async def sos_broadcast(
    payload: SOSBroadcastRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("ward_admin", "ward_officer", "super_admin"):
        raise HTTPException(status_code=403, detail="Only ward admins can broadcast SOS alerts")

    try:
        ward_number = int(payload.ward_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="ward_id must be a numeric ward number")

    result = broadcast_sos(
        ward_number=ward_number,
        message=payload.message,
        broadcast_by=current_user.get("user_id", "unknown"),
        sender_name=current_user.get("name", ""),
    )
    return result


@router.get("/debug")
def debug_config():
    import os
    return {
        "twilio_account_sid_set": bool(os.getenv("TWILIO_ACCOUNT_SID")),
        "twilio_auth_token_set":  bool(os.getenv("TWILIO_AUTH_TOKEN")),
        "twilio_phone_set":       bool(os.getenv("TWILIO_PHONE_NUMBER")),
        "twilio_whatsapp_set":    bool(os.getenv("TWILIO_WHATSAPP_NUMBER")),
    }