import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import (
    ALLOWED_ORIGINS,
    IS_PRODUCTION,
    ENVIRONMENT,
    HOST,
    PORT
)
from app.models.database import init_db
from app.routes import auth, chat, issues, admin, voice, faculty
from app.services.rag_service import initialize_vectorstore
from app.services.student_service import init_student_index
from app.services.faculty_service import init_faculty_index

logging.basicConfig(
    level=logging.INFO if IS_PRODUCTION else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Sequence
    logger.info(f"Starting Multilingual AI Campus Assistant Backend (Env: {ENVIRONMENT})...")
    await init_db()
    init_student_index()
    init_faculty_index()
    initialize_vectorstore()
    yield
    # Shutdown Sequence
    logger.info("Gracefully shutting down...")


app = FastAPI(
    title="Multilingual AI Campus Assistant",
    description="Backend for BIT Sathyamangalam AI Digital Human",
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
    lifespan=lifespan
)

# Explicit CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    max_age=3600
)


# Security Headers Middleware
@app.middleware("http")
async def apply_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Safe Global Exception Handler to prevent stack trace leaks
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception processing {request.method} {request.url.path}: {exc}", exc_info=True)
    if IS_PRODUCTION:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred. Please contact the BIT IT cell."}
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)}
    )


# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
app.include_router(faculty.router, prefix="/api/faculty", tags=["faculty"])


@app.get("/api/health", tags=["health"])
async def health_check():
    """Health check endpoint for container orchestrators and uptime monitors."""
    return {
        "status": "healthy",
        "service": "BIT CampusVoice API",
        "environment": ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=not IS_PRODUCTION)
