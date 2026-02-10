from fastapi import APIRouter, Query
from social_monitor import start_monitoring, get_status

router = APIRouter(prefix="/api/social", tags=["Social"])

@router.get("/monitor/status")
async def monitor_status():
    return get_status()

@router.post("/monitor/start")
async def monitor_start(hours_back: int = Query(24, ge=1, le=168)):
    return start_monitoring(hours_back)
