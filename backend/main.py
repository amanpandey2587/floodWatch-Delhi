from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.state import state
from routes import (
    auth_routes,
    complaint_routes,
    notification_routes,
    map_routes,
    admin_routes,
    safe_parking_routes
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    state.load_data()
    yield
    print("Shutting down...")

app = FastAPI(title="Delhi Water-logging API", lifespan=lifespan)

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
app.include_router(admin_routes.router)
app.include_router(safe_parking_routes.router)

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
            "safe_parking": "/api/safe-parking"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)