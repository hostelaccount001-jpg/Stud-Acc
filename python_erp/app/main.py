import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import auth, kiosk, students, services, reports, hardware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("python_erp")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise-Grade Python ERP & Kiosk Backend with Mantra Fingerprint & Thermal Direct Printing",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Timing & Security Middleware
@app.middleware("http")
async def add_process_time_and_security(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response

# Include Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(kiosk.router, prefix=settings.API_PREFIX)
app.include_router(students.router, prefix=settings.API_PREFIX)
app.include_router(services.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(hardware.router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": f"{settings.API_PREFIX}/docs",
        "timestamp": time.time()
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "engine": "FastAPI + Mantra Minutiae Matcher",
        "hardware": {
            "mantra_fingerprint": "ready",
            "thermal_printer": "ready",
            "nfc_reader": "ready"
        }
    }
