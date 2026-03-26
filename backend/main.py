from fastapi import FastAPI, Request
import os
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from core.state import state
from routes.sos_route import router as sos_router
from routes import (
    auth_routes,
    complaint_routes,
    notification_routes,
    map_routes,
    frontend_map_routes,
    admin_routes,
    safe_parking_routes,
    social_routes
)
# load_dotenv()
# PORT = os.getenv("PORT", "8000")
PORT=8000

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    state.load_data()
    yield
    print("Shutting down...")

app = FastAPI(title="Delhi Water-logging API", lifespan=lifespan)
app.include_router(sos_router, prefix="/api")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body_bytes = await request.body()
    try:
        body_text = body_bytes.decode("utf-8")
    except Exception:
        body_text = str(body_bytes)
    print(f"[ValidationError] path={request.url.path} errors={exc.errors()} body={body_text}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], # Added * for mobile dev flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Include Routers
app.include_router(auth_routes.router)
app.include_router(complaint_routes.router)
app.include_router(notification_routes.router)
app.include_router(map_routes.router)
app.include_router(frontend_map_routes.router)
app.include_router(admin_routes.router)
app.include_router(safe_parking_routes.router)
app.include_router(social_routes.router)

@app.get("/")
def read_root():
    return {
        "message": "FloodWatch Delhi API", 
        "status": "running",
        "endpoints": {
            "auth": "/api/auth (register, login, me)",
            "complaints": "/api/complaints",
            "notifications": "/api/notifications",
            "map": "/api",
            "admin": "/api/admin",
            "safe_parking": "/api/safe-parking",
            "social": "/api/social"
        }
    }

@app.get('/')
def home():
    return{"Hello : this is homepage"}

@app.get('/health')
def health():
    return {"status":"ok"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
