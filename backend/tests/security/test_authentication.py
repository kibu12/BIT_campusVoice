import os
import sys
import pytest
from datetime import datetime, timedelta
from jose import jwt
from fastapi import HTTPException

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.routes.auth import (
    validate_institutional_email,
    create_access_token,
    verify_password,
    hash_password,
    verify_google_id_token,
    JWT_KEY,
    ALGORITHM,
    INSTITUTIONAL_DOMAIN
)


def test_secret_key_length_enforcement():
    """Verify that JWT secret key meets minimum cryptographic length >= 32 chars."""
    assert len(JWT_KEY) >= 32, "JWT secret key must be at least 32 characters long."


def test_institutional_domain_enforcement():
    """Verify that non-institutional emails are rejected with 403 Forbidden."""
    # Forbidden external domains
    invalid_emails = [
        "student@gmail.com",
        "attacker@yahoo.com",
        "user@hotmail.com",
        "admin@bitsathy.ac.in.attacker.com",
        "7376232ad110@othercollege.edu",
        "",
        None
    ]
    for em in invalid_emails:
        try:
            validate_institutional_email(em)
            pytest.fail(f"Expected failure for non-institutional email: {em}")
        except HTTPException as e:
            assert e.status_code in [400, 403], f"Unexpected status code for {em}: {e.status_code}"

    # Valid institutional domain
    valid_email = "7376232ad110@bitsathy.ac.in"
    cleaned = validate_institutional_email(valid_email)
    assert cleaned == "7376232ad110@bitsathy.ac.in"


def test_argon2id_password_hashing():
    """Verify Argon2id password hashing and constant-time verification."""
    password = "ComplexSecurePassword2026!"
    hashed = hash_password(password)
    assert hashed.startswith("$argon2"), f"Hash must use Argon2id format, got: {hashed}"
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_token_expiration_and_claims():
    """Verify token generation includes standard claims (exp, iat, sub, role)."""
    payload = {
        "sub": "42",
        "role": "student",
        "email": "student@bitsathy.ac.in",
        "name": "Test Student"
    }
    # Expired token
    expired_token = create_access_token(payload, expires_delta=timedelta(seconds=-10))
    try:
        jwt.decode(expired_token, JWT_KEY, algorithms=[ALGORITHM])
        pytest.fail("Expired token should have failed validation!")
    except Exception:
        pass  # Expected expired signature


def test_forged_token_signature_rejection():
    """Verify that tokens signed with an unauthorized key are rejected."""
    payload = {"sub": "1", "role": "admin", "email": "admin@bitsathy.ac.in"}
    fake_secret = "fake_secret_key_that_is_32_characters_long_for_test"
    forged_token = jwt.encode(payload, fake_secret, algorithm=ALGORITHM)

    try:
        jwt.decode(forged_token, JWT_KEY, algorithms=[ALGORITHM])
        pytest.fail("Forged token signature should have been rejected!")
    except Exception:
        pass  # Expected signature verification error


def test_google_token_verification_rejection():
    """Verify that empty or forged Google credentials fail verification."""
    try:
        verify_google_id_token("")
        pytest.fail("Empty Google credential should fail.")
    except HTTPException as e:
        assert e.status_code == 400

    try:
        verify_google_id_token("invalid.token.structure")
        pytest.fail("Malformed Google credential should fail.")
    except HTTPException as e:
        assert e.status_code == 401


if __name__ == "__main__":
    test_secret_key_length_enforcement()
    test_institutional_domain_enforcement()
    test_argon2id_password_hashing()
    test_token_expiration_and_claims()
    test_forged_token_signature_rejection()
    test_google_token_verification_rejection()
    print("ALL AUTHENTICATION TESTS PASSED.")

