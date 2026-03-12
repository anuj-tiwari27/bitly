"""Tests for authentication utilities."""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4


def test_password_hashing():
    """Test password hashing and verification."""
    import sys
    # Clear cached modules from other services so we get rbac-service
    for k in list(sys.modules):
        if k in ("schemas", "auth", "config") or k.startswith("qr_"):
            del sys.modules[k]
    while "services/rbac-service" in sys.path or "services\\rbac-service" in sys.path:
        for p in ["services/rbac-service", "services\\rbac-service"]:
            if p in sys.path:
                sys.path.remove(p)
    sys.path.insert(0, "services/rbac-service")
    from auth import hash_password, verify_password
    
    password = "TestPassword123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_access_token_creation():
    """Test JWT access token creation."""
    import sys
    for k in list(sys.modules):
        if k in ("schemas", "auth", "config") or k.startswith("qr_"):
            del sys.modules[k]
    for p in ["services/rbac-service", "services\\rbac-service"]:
        while p in sys.path:
            sys.path.remove(p)
    sys.path.insert(0, "services/rbac-service")
    from auth import create_access_token, verify_access_token
    
    user_id = uuid4()
    email = "test@example.com"
    roles = ["marketing_user"]
    
    token = create_access_token(user_id, email, roles)
    
    assert token is not None
    assert len(token) > 0
    
    payload = verify_access_token(token)
    
    assert payload is not None
    assert payload.sub == str(user_id)
    assert payload.email == email
    assert payload.roles == roles


def test_access_token_expiry():
    """Test JWT access token expiration."""
    import sys
    for k in list(sys.modules):
        if k in ("schemas", "auth", "config") or k.startswith("qr_"):
            del sys.modules[k]
    for p in ["services/rbac-service", "services\\rbac-service"]:
        while p in sys.path:
            sys.path.remove(p)
    sys.path.insert(0, "services/rbac-service")
    from auth import create_access_token, verify_access_token
    
    user_id = uuid4()
    email = "test@example.com"
    roles = []
    
    # Create expired token
    token = create_access_token(
        user_id, email, roles,
        expires_delta=timedelta(seconds=-1)
    )
    
    payload = verify_access_token(token)
    
    assert payload is None


def test_refresh_token_creation():
    """Test refresh token creation."""
    import sys
    for k in list(sys.modules):
        if k in ("schemas", "auth", "config") or k.startswith("qr_"):
            del sys.modules[k]
    for p in ["services/rbac-service", "services\\rbac-service"]:
        while p in sys.path:
            sys.path.remove(p)
    sys.path.insert(0, "services/rbac-service")
    from auth import create_refresh_token, verify_refresh_token_hash
    
    user_id = uuid4()
    token, token_hash, expires_at = create_refresh_token(user_id)
    
    assert token is not None
    assert token_hash is not None
    assert expires_at > datetime.now(timezone.utc)
    
    assert verify_refresh_token_hash(token, token_hash)
    assert not verify_refresh_token_hash("wrong_token", token_hash)
