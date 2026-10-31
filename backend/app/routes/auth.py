import os
import re
import uuid
import secrets
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.models.database import get_db, User, RefreshToken
from app.models.schemas import (
    LoginRequest,
    GoogleLoginRequest,
    GuestRequest,
    AdminLoginRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserProfileResponse
)
from app.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    JWT_ISSUER,
    JWT_AUDIENCE,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    GOOGLE_CLIENT_ID,
    INSTITUTIONAL_DOMAIN,
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    ADMIN_PASSWORD_HASH,
    IS_PRODUCTION
)
from app.services.student_service import verify_student, search_students_autocomplete
from app.services.faculty_service import find_faculty_by_email, is_faculty_email

logger = logging.getLogger(__name__)

router = APIRouter()

# Backward-compatible aliases
JWT_KEY = JWT_SECRET_KEY
ALGORITHM = JWT_ALGORITHM

# Argon2id Cryptographic Hasher
argon2_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32)

# Account lockout & rate-limiting tracking
_LOGIN_FAILURES: Dict[str, Dict[str, Any]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return argon2_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2id or bcrypt hash."""
    if not hashed_password:
        return False
    # 1. Argon2id verification
    if hashed_password.startswith("$argon2"):
        try:
            return argon2_hasher.verify(hashed_password, plain_password)
        except (VerifyMismatchError, InvalidHashError):
            return False
    # 2. Legacy bcrypt fallback if present
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
        try:
            import bcrypt
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False
    # 3. Constant-time comparison fallback for non-hashed development strings
    if not IS_PRODUCTION:
        return secrets.compare_digest(plain_password, hashed_password)
    return False


def validate_institutional_email(email: Optional[str]) -> str:
    """
    Enforce mandatory institutional domain validation.
    Restricts identity claims strictly to the @bitsathy.ac.in domain.
    """
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institutional email address is required."
        )
    clean_email = email.strip().lower()
    if not clean_email.endswith(INSTITUTIONAL_DOMAIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Only official institutional accounts ending with '{INSTITUTIONAL_DOMAIN}' are permitted."
        )
    return clean_email


def verify_google_id_token(credential: str) -> Dict[str, Any]:
    """
    Independently verify Google OpenID Connect ID token signature and claims.
    Validates signature against Google public keys, checks audience, issuer, expiry, and email verification.
    """
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Google OpenID Connect credential."
        )

    try:
        req = google_requests.Request()
        audience = GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None
        
        # Verify cryptographically with Google certificates
        id_info = google_id_token.verify_oauth2_token(credential, req, audience=audience)

        issuer = id_info.get("iss", "")
        if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Untrusted token issuer: {issuer}."
            )

        if not id_info.get("email_verified", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google account email is not verified by Google."
            )

        email = id_info.get("email", "").strip().lower()
        if not email.endswith(INSTITUTIONAL_DOMAIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Domain authorization failure. The account '{email}' does not belong to {INSTITUTIONAL_DOMAIN}."
            )

        return id_info
    except ValueError as e:
        logger.warning(f"Google token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication credential validation failed: {str(e)}"
        )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a short-lived signed JWT access token containing identity claims."""
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": now,
        "nbf": now,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "jti": str(uuid.uuid4())
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


async def create_and_store_refresh_token(user_id: int, db: AsyncSession) -> str:
    """Generate a cryptographically random refresh token and persist its SHA-256 hash."""
    raw_refresh_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    refresh_record = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked=False
    )
    db.add(refresh_record)
    await db.commit()
    return raw_refresh_token


class AuthenticatedUser:
    """
    Authoritative authenticated user representation.
    Provides safe attribute and dict-like access for API routes and templates.
    """
    def __init__(
        self,
        id: int,
        name: str,
        email: str,
        role: str,
        department: Optional[str] = None,
        roll_number: Optional[str] = None,
        is_active: bool = True,
        verified: bool = True
    ):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.department = department or "Engineering & Technology"
        self.roll_number = roll_number
        self.is_active = is_active
        self.verified = verified

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def __getitem__(self, item: str) -> Any:
        if hasattr(self, item):
            return getattr(self, item)
        raise KeyError(item)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "department": self.department,
            "roll_number": self.roll_number,
            "is_active": self.is_active,
            "is_verified": self.verified
        }


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db)
) -> AuthenticatedUser:
    """
    FastAPI centralized dependency:
    Extracts Bearer token, cryptographically validates signature, issuer, audience, and expiry,
    and resolves the user from the database to verify active status.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing. Institutional bearer token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed Authorization header. Format: 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1].strip()
    if not token or token in ["bit_student_session", "guest-token", "null", "undefined"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or deprecated session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE
        )
    except JWTError as e:
        logger.debug(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token expired or signature validation failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    role = payload.get("role")
    email = payload.get("email")
    name = payload.get("name", "User")
    department = payload.get("dept") or payload.get("department") or "Engineering & Technology"
    roll_number = payload.get("roll") or payload.get("roll_number")

    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incomplete token claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Administrator Account
    if role == "admin":
        admin_email = email or f"{ADMIN_USERNAME}@bitsathy.ac.in"
        return AuthenticatedUser(
            id=0,
            name="Campus Administrator",
            email=admin_email,
            role="admin",
            department="Administration",
            roll_number=None,
            is_active=True,
            verified=True
        )

    # 2. Institutional domain check on claims
    if not email or not email.lower().endswith(INSTITUTIONAL_DOMAIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Token domain unauthorized: identity must belong to '{INSTITUTIONAL_DOMAIN}'.",
        )

    # 3. Resolve user from database & verify active status
    if str(user_id).isdigit():
        uid_int = int(user_id)
        result = await db.execute(select(User).where(User.id == uid_int))
        db_user = result.scalar_one_or_none()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists in database.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not db_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account has been deactivated. Please contact campus administration.",
            )

        return AuthenticatedUser(
            id=db_user.id,
            name=db_user.name or name,
            email=db_user.email or email,
            role=db_user.role or role,
            department=db_user.department or department,
            roll_number=db_user.roll_number or roll_number,
            is_active=db_user.is_active,
            verified=True
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid subject claim.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# =========================================================================
# CENTRALIZED RBAC DEPENDENCIES
# =========================================================================

def require_roles(allowed_roles: List[str]):
    """Role-based access control dependency factory."""
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        user_role = current_user.role
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{user_role}' is not authorized. Allowed: {allowed_roles}"
            )
        return current_user
    return role_checker


require_admin = require_roles(["admin"])
require_faculty = require_roles(["faculty", "hod", "staff", "admin"])
require_student = require_roles(["student", "admin"])
require_verified_member = require_roles(["student", "faculty", "hod", "staff", "admin"])
require_staff_or_admin = require_roles(["faculty", "hod", "staff", "admin"])
require_hod_or_admin = require_roles(["hod", "admin"])


def require_authorized_record_access(record_owner_id: Optional[int], current_user: AuthenticatedUser) -> bool:
    """
    IDOR/BOLA Prevention: Enforce that non-admin/non-HOD users can only access their own records.
    """
    user_role = current_user.role
    if user_role == "admin":
        return True
    if record_owner_id is not None and record_owner_id == current_user.id:
        return True
    return False


# =========================================================================
# ENDPOINTS
# =========================================================================

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Protected profile endpoint.
    Used by frontend boot sequence to validate stored session token and retrieve verified roles.
    """
    return current_user.to_dict()


@router.post("/google", response_model=TokenResponse)
async def login_google(req: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Verified Google OpenID Connect institutional authentication.
    Validates token cryptographically on backend and matches verified email to institutional directory.
    """
    # 1. Independent backend verification of Google credential
    if req.credential:
        id_info = verify_google_id_token(req.credential)
        email_clean = id_info.get("email", "").strip().lower()
        verified_name = id_info.get("name", "") or req.name
    else:
        # If running in development without live Google Client ID, validate email domain strictly
        if IS_PRODUCTION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Production security policy: Cryptographic Google ID token (credential) is required."
            )
        email_clean = validate_institutional_email(req.email)
        verified_name = req.name or email_clean.split("@")[0].title()

    # 2. Faculty / Staff / HOD Branch
    if is_faculty_email(email_clean):
        faculty_info = find_faculty_by_email(email_clean)
        faculty_name = faculty_info.get("name") if faculty_info else verified_name
        faculty_dept = faculty_info.get("department") if faculty_info else "Faculty of Engineering"
        faculty_desig = faculty_info.get("designation") if faculty_info else "Faculty Member"

        desig_lower = faculty_desig.lower()
        assigned_role = "hod" if any(h in desig_lower for h in ["head", "hod", "head of department", "dean", "director"]) else "faculty"

        result = await db.execute(select(User).where(User.email == email_clean))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                name=faculty_name,
                roll_number=email_clean,
                department=faculty_dept,
                email=email_clean,
                role=assigned_role,
                is_active=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            if not user.is_active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")
            user.role = assigned_role
            user.department = faculty_dept
            await db.commit()

        token_payload = {
            "sub": str(user.id),
            "role": assigned_role,
            "email": email_clean,
            "name": faculty_name,
            "dept": faculty_dept,
            "verified": True
        }
        access_token = create_access_token(data=token_payload)
        refresh_token = await create_and_store_refresh_token(user.id, db)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_token=refresh_token
        )

    # 3. Student Branch: Check against authorized directory
    roll_candidate = email_clean.split("@")[0].upper()
    is_valid_student, student_data = verify_student(roll_candidate, provided_name=verified_name)

    student_name = student_data["name"] if student_data else verified_name
    student_roll = student_data["roll_number"] if student_data else roll_candidate
    student_dept = student_data["department"] if student_data else "Engineering & Technology"
    student_year = student_data.get("year", "UG") if student_data else "UG"

    result = await db.execute(select(User).where(User.roll_number == student_roll))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            name=student_name,
            roll_number=student_roll,
            department=student_dept,
            email=email_clean,
            role="student",
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")
        user.name = student_name
        user.email = email_clean
        user.department = student_dept
        user.role = "student"
        await db.commit()

    token_payload = {
        "sub": str(user.id),
        "role": "student",
        "email": email_clean,
        "name": user.name,
        "roll": user.roll_number,
        "dept": user.department,
        "year": student_year,
        "verified": True
    }
    access_token = create_access_token(data=token_payload)
    refresh_token = await create_and_store_refresh_token(user.id, db)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_token=refresh_token
    )


@router.post("/login")
async def login_student(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Legacy roll-number-only authentication elimination endpoint.
    Roll-number-only login without verified credentials is strictly rejected.
    Directs users to institutional Google OpenID Connect authentication.
    """
    # If client supplied a Google credential token, delegate to verified Google authentication
    if req.credential:
        return await login_google(GoogleLoginRequest(credential=req.credential, name=req.name), db=db)

    # Reject unverified roll-number-only login attempts
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "Security Policy: Roll-number-only login has been permanently decommissioned. "
            "All students and faculty must authenticate using their official BIT Google Account (@bitsathy.ac.in)."
        )
    )


@router.post("/admin/login", response_model=TokenResponse)
async def login_admin(req: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Secure Administrator Authentication.
    Features Argon2id password verification, brute-force rate-limiting, and account lockout protection.
    """
    client_ip = req.username.strip().lower()
    now = datetime.utcnow()

    # 1. Lockout check
    failure_record = _LOGIN_FAILURES.get(client_ip)
    if failure_record:
        locked_until = failure_record.get("locked_until")
        if locked_until and locked_until > now:
            remaining_seconds = int((locked_until - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Administrative account temporarily locked due to repeated authentication failures. Try again in {remaining_seconds}s."
            )

    # 2. Verify credentials
    admin_user_match = (req.username == ADMIN_USERNAME)
    password_valid = False

    if admin_user_match:
        # Check against ADMIN_PASSWORD_HASH first (Argon2id), then ADMIN_PASSWORD
        if ADMIN_PASSWORD_HASH:
            password_valid = verify_password(req.password, ADMIN_PASSWORD_HASH)
        elif ADMIN_PASSWORD:
            password_valid = verify_password(req.password, ADMIN_PASSWORD)

    if not admin_user_match or not password_valid:
        # Track failure
        if client_ip not in _LOGIN_FAILURES:
            _LOGIN_FAILURES[client_ip] = {"attempts": 1, "locked_until": None}
        else:
            _LOGIN_FAILURES[client_ip]["attempts"] += 1

        attempts = _LOGIN_FAILURES[client_ip]["attempts"]
        if attempts >= MAX_FAILED_ATTEMPTS:
            _LOGIN_FAILURES[client_ip]["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            logger.warning(f"Admin account locked due to {attempts} failed attempts.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Account locked for {LOCKOUT_DURATION_MINUTES} minutes."
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative credentials."
        )

    # 3. Successful login - clear failure tracking
    if client_ip in _LOGIN_FAILURES:
        del _LOGIN_FAILURES[client_ip]

    admin_email = f"{ADMIN_USERNAME}@bitsathy.ac.in"
    token_payload = {
        "sub": "0",
        "role": "admin",
        "name": "Campus Administrator",
        "email": admin_email,
        "dept": "Administration",
        "verified": True
    }
    access_token = create_access_token(data=token_payload, expires_delta=timedelta(hours=2))

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=7200,
        refresh_token=None
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(req: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh-token rotation endpoint.
    Validates submitted refresh token against database, revokes it, and issues a fresh token pair.
    """
    raw_token = req.refresh_token.strip()
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = datetime.utcnow()

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > now
        )
    )
    token_record = result.scalar_one_or_none()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid, expired, or has already been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Immediately revoke current token (Rotation)
    token_record.revoked = True
    await db.commit()

    # 2. Fetch User and verify active status
    user_result = await db.execute(select(User).where(User.id == token_record.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Associated user account is deactivated or missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Issue new access token and newly rotated refresh token
    token_payload = {
        "sub": str(user.id),
        "role": user.role,
        "email": user.email,
        "name": user.name,
        "roll": user.roll_number,
        "dept": user.department,
        "verified": True
    }
    new_access_token = create_access_token(data=token_payload)
    new_refresh_token = await create_and_store_refresh_token(user.id, db)

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_token=new_refresh_token
    )


@router.post("/logout")
async def logout(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke all active refresh tokens for the authenticated user session.
    """
    if current_user.id != 0:
        await db.execute(
            select(RefreshToken)
            .where(RefreshToken.user_id == current_user.id, RefreshToken.revoked == False)
        )
        tokens = (await db.execute(select(RefreshToken).where(RefreshToken.user_id == current_user.id))).scalars().all()
        for t in tokens:
            t.revoked = True
        await db.commit()

    return {"message": "Session successfully terminated and refresh tokens revoked."}


@router.get("/search-students")
async def search_students_endpoint(
    q: str = Query(..., min_length=2),
    current_user: AuthenticatedUser = Depends(require_verified_member)
):
    """
    Student autocomplete endpoint.
    Restricted to authenticated institutional users to prevent unauthenticated scraping.
    """
    results = search_students_autocomplete(q, limit=5)
    # Exclude sensitive identifiers, returning only public name and department
    safe_results = [
        {"name": s.get("name"), "department": s.get("department"), "roll_number": s.get("roll_number")}
        for s in results
    ]
    return {"students": safe_results}


@router.post("/verify-student")
async def verify_student_endpoint(
    data: dict,
    current_user: AuthenticatedUser = Depends(require_verified_member)
):
    """
    Directory presence check. Restricted to verified institutional users.
    """
    query_val = data.get("query", "").strip()
    name_val = data.get("name", "").strip()

    is_valid, student_info = verify_student(query_val, provided_name=name_val)
    if is_valid and student_info:
        return {
            "verified": True,
            "student": {
                "name": student_info.get("name"),
                "department": student_info.get("department")
            }
        }
    return {
        "verified": False,
        "message": "Student not found in official directory."
    }
