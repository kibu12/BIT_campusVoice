import os
import sys
import asyncio
import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.main import app
from app.routes.auth import create_access_token
from app.models.database import init_db, AsyncSessionLocal, User

client = TestClient(app)

# Setup Database and Seed Test Accounts
def setup_module():
    async def _setup():
        await init_db()
        async with AsyncSessionLocal() as session:
            # Seed test student
            res = await session.execute(select(User).where(User.id == 101))
            if not res.scalar_one_or_none():
                student = User(
                    id=101,
                    name="Test Student",
                    email="student@bitsathy.ac.in",
                    roll_number="7376232AD110",
                    role="student",
                    department="Artificial Intelligence and Data Science",
                    is_active=True
                )
                session.add(student)

            # Seed test HOD
            res_hod = await session.execute(select(User).where(User.id == 50))
            if not res_hod.scalar_one_or_none():
                hod = User(
                    id=50,
                    name="HOD IT",
                    email="hod.it@bitsathy.ac.in",
                    role="hod",
                    department="Information Technology",
                    is_active=True
                )
                session.add(hod)

            await session.commit()

    asyncio.run(_setup())


# Token helper fixtures
def make_student_token(user_id=101, email="student@bitsathy.ac.in", name="Test Student"):
    return create_access_token({
        "sub": str(user_id),
        "role": "student",
        "email": email,
        "name": name,
        "department": "Artificial Intelligence and Data Science"
    }, expires_delta=timedelta(minutes=30))

def make_admin_token(user_id=0, email="admin@bitsathy.ac.in", name="Admin"):
    return create_access_token({
        "sub": str(user_id),
        "role": "admin",
        "email": email,
        "name": name
    }, expires_delta=timedelta(minutes=30))

def make_hod_token(user_id=50, email="hod.it@bitsathy.ac.in", name="HOD IT"):
    return create_access_token({
        "sub": str(user_id),
        "role": "hod",
        "email": email,
        "name": name,
        "department": "Information Technology"
    }, expires_delta=timedelta(minutes=30))


def test_health_check_endpoint():
    """Verify health endpoint is operational and returns expected metadata."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "healthy"
    assert "service" in data


def test_security_headers_enforcement():
    """Verify that HTTP security headers are injected into API responses."""
    res = client.get("/api/health")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in headers.get("Permissions-Policy", "")


def test_unauthenticated_requests_fail():
    """Verify that endpoints requiring authentication reject unauthenticated requests with 401."""
    protected_endpoints = [
        ("GET", "/api/auth/me"),
        ("POST", "/api/chat"),
        ("GET", "/api/issues"),
        ("POST", "/api/issues"),
        ("GET", "/api/admin/settings"),
        ("POST", "/api/faculty/reload"),
    ]
    for method, path in protected_endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code == 401, f"Expected 401 for unauthenticated {method} {path}, got {res.status_code}"


def test_rbac_admin_endpoint_forbidden_for_students():
    """Verify that students cannot access administrative endpoints (returns 403)."""
    student_token = make_student_token()
    headers = {"Authorization": f"Bearer {student_token}"}

    # Settings
    res = client.get("/api/admin/settings", headers=headers)
    assert res.status_code == 403, f"Expected 403 for student accessing admin settings, got {res.status_code}"

    # Faculty reload
    res = client.post("/api/faculty/reload", headers=headers)
    assert res.status_code == 403, f"Expected 403 for student accessing faculty reload, got {res.status_code}"


def test_admin_settings_masks_sensitive_values():
    """Verify that admin settings endpoint masks API keys and secrets with asterisks."""
    admin_token = make_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/admin/settings", headers=headers)
    assert res.status_code == 200
    data = res.json()
    settings = data.get("settings", {})

    # Sensitive keys must be masked
    for key in ["jwt_secret_key", "groq_api_key", "tavily_api_key"]:
        val = settings.get(key, "")
        if val:
            assert "***" in val or val.startswith("sk-***") or val == "********", (
                f"Sensitive key {key} was leaked in plaintext: {val}"
            )


def test_sql_injection_resilience():
    """Verify that SQL injection payloads do not cause internal server errors or SQL syntax leaks."""
    sqli_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1' UNION SELECT 1, 'admin', 'password' --",
        "\" OR \"\"=\"",
    ]
    student_token = make_student_token()
    headers = {"Authorization": f"Bearer {student_token}"}

    for payload in sqli_payloads:
        # Search endpoint
        res = client.get(f"/api/faculty/search?q={payload}", headers=headers)
        assert res.status_code in [200, 404], f"Unexpected error on SQL injection test: {res.status_code}"
        content = res.text.lower()
        assert "syntax error" not in content
        assert "sqlite3.operationalerror" not in content
        assert "sqlalchemy" not in content


def test_voice_tts_input_length_validation():
    """Verify that oversized text-to-speech requests are rejected with 400 Bad Request."""
    oversized_text = "A" * 4500  # Exceeds 4000 character cap
    res = client.post("/api/voice/tts", json={"text": oversized_text})
    assert res.status_code == 400, f"Expected 400 for oversized text, got {res.status_code}"
    assert "maximum limit" in res.json().get("detail", "").lower()


def test_mass_assignment_protection_on_issues():
    """Verify that client cannot override user_id or inject arbitrary IDs when creating tickets."""
    student_token = make_student_token(user_id=101, email="student@bitsathy.ac.in")
    headers = {"Authorization": f"Bearer {student_token}"}

    spoofed_payload = {
        "title": "Broken Lab Chair",
        "description": "Chair arm is broken in Lab 2",
        "category": "Furniture",
        "location": "Lab 2",
        "user_id": 9999,  # Attempted spoof
        "status": "resolved"  # Attempted status override
    }

    res = client.post("/api/issues", json=spoofed_payload, headers=headers)
    assert res.status_code == 200, f"Failed creating issue: {res.text}"
    created = res.json()
    # Authoritative server-side identity: user_email bound to authenticated token
    assert created.get("user_email") == "student@bitsathy.ac.in"
    # Default status must remain open/reported, not client-injected 'resolved'
    assert created.get("status") in ["reported", "open"]

    # Verify directly in database that user_id was stored as 101 (NOT spoofed 9999)
    async def _verify_db():
        from app.models.database import Issue
        async with AsyncSessionLocal() as session:
            db_res = await session.execute(select(Issue).where(Issue.id == created["id"]))
            db_issue = db_res.scalar_one_or_none()
            assert db_issue is not None
            assert db_issue.user_id == 101, f"Expected DB user_id 101, got {db_issue.user_id}"
            assert db_issue.status in ["reported", "open"]

    asyncio.run(_verify_db())


if __name__ == "__main__":
    setup_module()
    test_health_check_endpoint()
    test_security_headers_enforcement()
    test_unauthenticated_requests_fail()
    test_rbac_admin_endpoint_forbidden_for_students()
    test_admin_settings_masks_sensitive_values()
    test_sql_injection_resilience()
    test_voice_tts_input_length_validation()
    test_mass_assignment_protection_on_issues()
    print("ALL API SECURITY TESTS PASSED.")
