from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from database import connect_to_mongo, close_mongo_connection, get_database
from routes import auth, patients, asha, voice, clinician, admin, pho, lab, appointments
from jobs.reminder_job import start_scheduler
from contextlib import asynccontextmanager
from config import settings
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

# Custom validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"[VALIDATION ERROR] Path: {request.url.path}")
    print(f"[VALIDATION ERROR] Errors: {exc.errors()}")
    print(f"[VALIDATION ERROR] Body: {exc.body}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

# Standard Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Radar Middleware: Sanitized
@app.middleware("http")
async def radar_middleware(request: Request, call_next):
    # Log only method and path to prevent leaking auth headers/tokens or sensitive info in query strings
    print(f"[RADAR]: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        if response.status_code >= 400:
            print(f"[WARNING] {response.status_code} DETECTED on {request.url.path}")
        return response
    except Exception as e:
        print("[CRASH] RADAR CRASH")
        raise e

# Setup CORS (Must be registered last to wrap all other middleware)
origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
# Add wildcard for mobile apps (Expo Go uses dynamic origins)
if "*" not in origins:
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrer Routers: Priority Order
app.include_router(auth.router,         prefix="/api/auth",         tags=["auth"])
app.include_router(asha.router,         prefix="/api/asha",         tags=["asha"])
app.include_router(patients.router,     prefix="/api/patients",     tags=["patients"])
app.include_router(voice.router,        prefix="/api/voice",        tags=["voice"])
app.include_router(clinician.router,    prefix="/api/clinician",    tags=["clinician"])
app.include_router(admin.router,        prefix="/api/admin",        tags=["admin"])
app.include_router(pho.router,          prefix="/api/pho",          tags=["pho"])
app.include_router(lab.router,          prefix="/api/lab",          tags=["lab"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["appointments"])

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
