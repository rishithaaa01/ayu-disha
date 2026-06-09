from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection, get_database
from routes import auth, patients, asha, voice, clinician
from jobs.reminder_job import start_scheduler
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database is connected before app starts
    await connect_to_mongo()
    # Start background reminder scheduler
    app.state.scheduler = start_scheduler()
    yield
    await close_mongo_connection()

app = FastAPI(title="Ayu Disha API", lifespan=lifespan)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Radar Middleware: Capture everything
@app.middleware("http")
async def radar_middleware(request: Request, call_next):
    print(f"[RADAR]: {request.method} {request.url}")
    # Debug: Print Auth Header
    auth = request.headers.get("Authorization", "MISSING")
    
    try:
        response = await call_next(request)
        if response.status_code >= 400:
            print(f"[WARNING] {response.status_code} DETECTED on {request.url.path}")
        return response
    except Exception as e:
        print(f"[CRASH] RADAR CRASH: {str(e)}")
        raise e

# Registrer Routers: Priority Order
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(asha.router, prefix="/api/asha", tags=["asha"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
app.include_router(clinician.router, prefix="/api/clinician", tags=["clinician"])

@app.get("/")
async def root():
    db_status = "connected" if get_database() is not None else "disconnected"
    return {
        "status": "running",
        "database": db_status,
        "diagnostic": "Pass"
    }

# Fallback to catch malformed URLs
@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(request: Request, path_name: str):
    print(f"[CATCH-ALL]: Request reached {path_name} with method {request.method}")
    return JSONResponse(
        status_code=404,
        content={"error": "Path not found", "path": path_name}
    )

print("[START] Ayu Disha Master Backend is Live")
