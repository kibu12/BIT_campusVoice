import os
import sys
import logging
import secrets
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Base Directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv()

# Environment Mode
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower().strip()
IS_PRODUCTION = ENVIRONMENT == "production"

# Network Binding
HOST = os.getenv("HOST", "0.0.0.0").strip()
PORT = int(os.getenv("PORT", "8000").strip())

# Cryptographic Token Signing Secrets
_raw_jwt = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or ""
_raw_jwt = _raw_jwt.strip()

if not _raw_jwt or len(_raw_jwt) < 32:
    if IS_PRODUCTION:
        raise ValueError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY must be set in production with at least 32 characters.")
    else:
        logger.warning("DEVELOPMENT NOTICE: JWT_SECRET_KEY is missing or < 32 characters. Generating secure ephemeral key for this session.")
        JWT_SECRET_KEY = secrets.token_urlsafe(32)
else:
    JWT_SECRET_KEY = _raw_jwt

JWT_SECRET = JWT_SECRET_KEY
JWT_ALGORITHM = "HS256"
JWT_ISSUER = "bit-campus-voice"
JWT_AUDIENCE = "bit-campus-users"

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Google OpenID Connect Client Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
INSTITUTIONAL_DOMAIN = "@bitsathy.ac.in"

# Administrative Credentials
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin").strip()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "").strip()
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "").strip()

# External AI & Knowledge Retrieval API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()

# Database and Storage Paths
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/campus_assistant.db").strip()
DATA_DIR = os.path.join(BASE_DIR, "data")
DOCUMENTS_DIR = os.getenv("DOCUMENTS_DIR", os.path.join(DATA_DIR, "documents")).strip()
PROTECTED_DATA_DIR = os.path.join(DATA_DIR, "protected")
VECTORSTORE_DIR = os.path.join(DATA_DIR, "vectorstore")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DOCUMENTS_DIR, exist_ok=True)
os.makedirs(PROTECTED_DATA_DIR, exist_ok=True)
os.makedirs(VECTORSTORE_DIR, exist_ok=True)

# CORS Policy
_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
if _origins_env:
    ALLOWED_ORIGINS = [orig.strip() for orig in _origins_env.split(",") if orig.strip()]
else:
    # Explicit localhost origins for development
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

# SMTP Email Alert Settings
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587").strip())
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "").strip()

# Upload & Rate Limits
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit
RATE_LIMIT_LOGIN = "10/minute"
RATE_LIMIT_CHAT = "30/minute"
RATE_LIMIT_GLOBAL = "100/minute"

# Fail-Fast Startup Validation for Production
if IS_PRODUCTION:
    missing_vars = []
    if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
        missing_vars.append("JWT_SECRET_KEY (must be at least 32 characters)")
    if not GROQ_API_KEY:
        missing_vars.append("GROQ_API_KEY")
    if not DATABASE_URL:
        missing_vars.append("DATABASE_URL")
    if not _origins_env:
        missing_vars.append("ALLOWED_ORIGINS (explicit comma-separated list required in production)")
    if missing_vars:
        raise ValueError(
            f"CRITICAL PRODUCTION CONFIGURATION ERROR: Missing required environment variable(s): {', '.join(missing_vars)}. "
            "Please configure them in your production environment or .env file before starting the application."
        )
