from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Boolean, text
from datetime import datetime
import os
import logging
from app.config import DATABASE_URL

logger = logging.getLogger(__name__)

# Ensure data directory exists
os.makedirs('./data', exist_ok=True)

# Configure database engine with dialect-aware connection arguments
connect_args = {}
db_url = DATABASE_URL
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False
elif "postgresql" in db_url or "asyncpg" in db_url:
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "ssl=require" in db_url:
        db_url = db_url.replace("?ssl=require", "").replace("&ssl=require", "")
        connect_args["ssl"] = "require"

engine = create_async_engine(db_url, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    roll_number = Column(String, unique=True, index=True, nullable=True)
    department = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, default="student") # student, faculty, hod, staff, admin, guest
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    mfa_secret = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False) # SHA-256 hash of refresh token
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String, nullable=True)
    user_type = Column(String, default="student") # student, faculty, hod, staff, admin, guest
    session_id = Column(String, index=True)
    message = Column(Text)
    response = Column(Text)
    sources = Column(JSON, nullable=True)
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String)
    user_type = Column(String, default="student") # student, faculty, hod, staff, admin, guest
    user_email = Column(String, nullable=True)
    user_phone = Column(String, nullable=True)
    category = Column(String)
    location = Column(String)
    description = Column(Text)
    priority = Column(String, default="medium") # low, medium, high
    status = Column(String, default="open") # open, in_progress, resolved
    admin_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    filepath = Column(String)
    chunk_count = Column(Integer)
    access_level = Column(String, default="public") # public, student, faculty, admin
    sha256_hash = Column(String(64), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Migration helper for existing SQLite databases to add missing columns without losing records
        if engine.dialect.name == "sqlite":
            try:
                columns_query = await conn.execute(text("PRAGMA table_info(users)"))
                existing_user_cols = {row[1] for row in columns_query.fetchall()}
                
                if "hashed_password" not in existing_user_cols:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password TEXT"))
                if "is_active" not in existing_user_cols:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                if "failed_login_attempts" not in existing_user_cols:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0"))
                if "locked_until" not in existing_user_cols:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN locked_until DATETIME"))
                if "mfa_secret" not in existing_user_cols:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN mfa_secret TEXT"))
                    
                doc_cols_query = await conn.execute(text("PRAGMA table_info(documents)"))
                existing_doc_cols = {row[1] for row in doc_cols_query.fetchall()}
                if "access_level" not in existing_doc_cols:
                    await conn.execute(text("ALTER TABLE documents ADD COLUMN access_level TEXT DEFAULT 'public'"))
                if "sha256_hash" not in existing_doc_cols:
                    await conn.execute(text("ALTER TABLE documents ADD COLUMN sha256_hash TEXT"))
                    
                logger.info("Database schema verified and migrated successfully.")
            except Exception as e:
                logger.warning(f"Schema migration check notice (harmless if fresh DB): {e}")

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
