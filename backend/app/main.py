import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.database.session import engine, SessionLocal, Base
import app.models.models
from app.database.seed_data import seed_database
from app.database.migration_ai_generator import run_ai_generator_migrations
from app.database.migration_dynamic_layout import run_dynamic_layout_migrations
from app.database.migration_syllabus_grounding import run_syllabus_grounding_migrations

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.organizations import router as org_router
from app.api.v1.universities import router as university_router
from app.api.v1.institutions import router as institution_router
from app.api.v1.themes import router as theme_router
from app.api.v1.departments import router as dept_router
from app.api.v1.academics import router as academic_router
from app.api.v1.syllabus import router as syllabus_router
from app.api.v1.questions import router as question_router
from app.api.v1.question_papers import router as paper_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.audit import router as audit_router
from app.api.v1.users import router as user_router
from app.api.v1.contact import router as contact_router
from app.api.v1.student import router as student_router
from app.api.v1.university_admin import router as university_admin_router
from app.api.v1.hod import router as hod_router
from app.api.v1.faculty import router as faculty_router
from app.api.v1.coordinator import router as coordinator_router
from app.api.v1.controller import router as controller_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables and migrations exist
    Base.metadata.create_all(bind=engine)
    run_ai_generator_migrations(engine)
    run_dynamic_layout_migrations(engine)
    run_syllabus_grounding_migrations(engine)
    # Ensure upload directory exists
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_DIR, "syllabus"), exist_ok=True)
    
    # Auto-seed if database is freshly created
    db = SessionLocal()
    try:
        from app.models.models import User
        if db.query(User).count() == 0:
            seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for downloads/uploads
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.STORAGE_DIR), name="uploads")

# Global Exception Handlers for standard format
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "detail": exc.detail,
            "code": f"HTTP_{exc.status_code}"
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {}
    msg = f"{first_error.get('loc', ['field'])[-1]}: {first_error.get('msg', 'Validation error')}"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": msg,
            "code": "VALIDATION_ERROR",
            "details": jsonable_encoder(exc.errors())
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred.",
            "code": "INTERNAL_SERVER_ERROR"
        }
    )

# Include Routers
api_v1 = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1)
app.include_router(org_router, prefix=api_v1)
app.include_router(university_router, prefix=api_v1)
app.include_router(institution_router, prefix=api_v1)
app.include_router(theme_router, prefix=api_v1)
app.include_router(dept_router, prefix=api_v1)
app.include_router(academic_router, prefix=api_v1)
app.include_router(syllabus_router, prefix=api_v1)
app.include_router(question_router, prefix=api_v1)
app.include_router(paper_router, prefix=api_v1)
app.include_router(dashboard_router, prefix=api_v1)
app.include_router(audit_router, prefix=api_v1)
app.include_router(user_router, prefix=api_v1)
app.include_router(contact_router, prefix=api_v1)
app.include_router(student_router, prefix=api_v1)
app.include_router(university_admin_router, prefix=api_v1)
app.include_router(hod_router, prefix=api_v1)
app.include_router(faculty_router, prefix=api_v1)
app.include_router(coordinator_router, prefix=api_v1)
app.include_router(controller_router, prefix=api_v1)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "QPMS Apex API", "version": settings.VERSION}

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "University Question Paper Management & Generation System API",
        "documentation": "/docs",
        "health": "/health"
    }
