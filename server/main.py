"""
EduSphere LMS Backend — Student Learning Portal Application

EduSphere LMS — High-performance Student Learning Management System.

Run:
    uvicorn main:app --reload --port 5000
    
Seed Database:
    python -m utils.seed
"""
import sys
import os

# Ensure the server directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import dotenv
dotenv.load_dotenv()

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import settings
from database import engine, Base

# Import all models to register them with SQLAlchemy
from models import (
    User, Department, Course, Enrollment, TimetableEntry, CourseMaterial,
    AttendanceSession, AttendanceLog, ExamSchedule, ExamResult,
    FeeStructure, FeePayment, LedgerEntry, PlacementDrive, PlacementApplication, PlacementStats,

    Announcement, AuditLog, LeaveRequest, LibraryBook, BookIssue,
    SyncedSubject, SyncedFaculty, SyncedRoom, SyncedTimeSlot,
    SyncedTimetable, SyncedSemester, SyncedAttendance,
)



# Import routers
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.courses import router as courses_router
from routes.attendance import router as attendance_router
from routes.exams import router as exams_router
from routes.timetable import router as timetable_router
from routes.announcements import router as announcements_router
from routes.assignments import router as assignments_router
from routes.library import router as library_router
from routes.dashboard import router as dashboard_router
from routes.ai import router as ai_router
from routes.intelligence import router as intelligence_router
from routes.workspace import router as workspace_router
from routes.videos import router as videos_router
from routes.cms import router as cms_router
from routes.finance import router as finance_router
from routes.placements import router as placements_router
from routes.certificates import router as certificates_router
from routes.upload import router as upload_router

# Import middleware

from middleware.rate_limit import RateLimitMiddleware
from middleware.validation import InputValidationMiddleware, SecurityHeadersMiddleware
from middleware.logging import RequestLoggingMiddleware

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.analytics import run_analytics_job
from services.legacy_sync import sync_agent
import asyncio

# Wrapper for synchronous legacy sync job
def run_legacy_sync_job():
    sync_agent.run_sync()

# ─── SCHEDULER ───
scheduler = AsyncIOScheduler()
scheduler.add_job(run_analytics_job, 'interval', minutes=60) # Run every hour
scheduler.add_job(run_legacy_sync_job, 'interval', minutes=30) # Sync legacy DBs every 30 minutes

# ─── LIFESPAN ───
@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed database if empty (e.g. fresh Render deployment)
    try:
        from database import SessionLocal
        from models.user import User
        from utils.seed import _seed_all
        db = SessionLocal()
        user_count = db.query(User).count()
        if user_count == 0:
            print("[LIFESPAN] Database is empty. Seeding initial institutional demo data...")
            _seed_all(db)
            db.commit()
            print("[LIFESPAN] Database auto-seeded successfully!")
        db.close()
    except Exception as se:
        print(f"[LIFESPAN SEED WARNING] Auto-seed check/population failed: {se}")

    # Initialize Redis for WebSockets
    from utils.websocket_manager import manager
    await manager.initialize_redis()

    # Trigger Initial database legacy sync on startup asynchronously
    try:
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, sync_agent.run_sync)
    except Exception as e:
        print(f"[LIFESPAN ERROR] Legacy sync startup run failed: {e}")
    
    scheduler.start()
    print("[OK] Background task scheduler started")
    print("[OK] EduSphere LMS API server started")
    print("[DOCS] API Docs: http://localhost:5000/api/docs")
    print("[DOCS] ReDoc: http://localhost:5000/api/redoc")
    yield
    scheduler.shutdown()
    print("[OK] Background task scheduler stopped")




# ─── APPLICATION ───
app = FastAPI(
    title="EduSphere LMS API",
    description="EduSphere LMS — Student Learning Management System Portal",
    version="3.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ─── GLOBAL EXCEPTION HANDLER ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return structured JSON error responses."""
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    print(f"[ERROR] [{correlation_id}] Unhandled exception: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred.",
            "correlation_id": correlation_id,
            "type": type(exc).__name__,
        },
    )

# ─── MIDDLEWARE (order matters: last added = first executed) ───
# 1. CORS (outermost — must be first to handle preflight)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "Range"],
    expose_headers=["X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Content-Range", "Accept-Ranges"],
)

# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. Rate limiting
# 3. Rate limiting (Enhanced for Enterprise development)
app.add_middleware(RateLimitMiddleware, general_limit=200, auth_limit=50, window_seconds=60)

# 4. Request logging
app.add_middleware(RequestLoggingMiddleware)

# 5. Input validation / sanitization
# app.add_middleware(InputValidationMiddleware)

# ─── REGISTER ROUTERS ───
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(attendance_router)
app.include_router(exams_router)
app.include_router(timetable_router)
app.include_router(announcements_router)
app.include_router(assignments_router)
app.include_router(library_router)
app.include_router(intelligence_router)
app.include_router(ai_router)
app.include_router(workspace_router)
app.include_router(videos_router)
app.include_router(cms_router)
app.include_router(finance_router)
app.include_router(placements_router)
app.include_router(certificates_router)
app.include_router(upload_router)

from fastapi import WebSocket, WebSocketDisconnect
from utils.websocket_manager import manager

@app.websocket("/ws/{org_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, org_id: str, user_id: str):
    await manager.connect(websocket, user_id, org_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or process incoming socket data if needed
            await manager.broadcast_to_institution({
                "type": "USER_ACTIVITY",
                "user_id": user_id,
                "action": "ping"
            }, org_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id, org_id)
        await manager.broadcast_pulse(org_id)


# ─── HEALTH CHECK ───
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "platform": "EduSphere LMS",
        "version": "3.0.0",
    }


# ─── DB HEALTH CHECK ───
@app.get("/api/health/db", tags=["System"])
def db_health_check():
    """Test connectivity to all database backends (SQLite + MS Access)."""
    results = {"sqlite": "unknown", "access": "unknown"}

    # Test SQLite
    try:
        from database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        results["sqlite"] = "connected"
    except Exception as e:
        results["sqlite"] = f"error: {e}"

    # Test MS Access
    try:
        from access_db import check_access_health
        access_status = check_access_health()
        results["access"] = access_status
    except ImportError:
        results["access"] = "module not available"
    except Exception as e:
        results["access"] = f"error: {e}"

    overall = "healthy" if all(
        v in ("connected", "healthy") or "connected" in str(v)
        for v in results.values()
    ) else "degraded"

    return {
        "status": overall,
        "databases": results,
        "platform": "EduSphere LMS",
    }


# ─── STATIC FRONTEND MOUNT (PRODUCTION SPA FALLBACK) ───
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
if not os.path.exists(dist_path):
    dist_path = "/app/dist"

assets_path = os.path.join(dist_path, "assets")
index_file = os.path.join(dist_path, "index.html")

if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="static_assets")

@app.get("/{full_path:path}", tags=["System"])
def spa_fallback(request: Request, full_path: str):
    if full_path.startswith("api"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="API endpoint not found")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "EduSphere LMS API",
        "description": "EduSphere LMS — Student Learning Management System",
        "docs": "/api/docs",
        "version": "3.0.0",
    }
