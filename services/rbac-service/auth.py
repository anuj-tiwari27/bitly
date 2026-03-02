"""Authentication utilities."""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import get_settings
from schemas import TokenPayload

settings = get_settings()
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(
    user_id: UUID,
    email: str,
    roles: list[str],
    expires_delta: timedelta | None = None
) -> str:
    """Create a JWT access token."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_expiry_minutes)
    
    now = datetime.utcnow()
    expire = now + expires_delta
    
    payload = {
        "sub": str(user_id),
        "email": email,
        "roles": roles,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "type": "access"
    }
    
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: UUID) -> tuple[str, str, datetime]:
    """
    Create a refresh token.
    Returns (token, token_hash, expires_at).
    """
    expires_at = datetime.utcnow() + timedelta(days=settings.jwt_refresh_expiry_days)
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    return token, token_hash, expires_at


def verify_access_token(token: str) -> Optional[TokenPayload]:
    """Verify and decode a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        
        if payload.get("type") != "access":
            return None
        
        return TokenPayload(
            sub=payload["sub"],
            email=payload["email"],
            roles=payload.get("roles", []),
            exp=payload["exp"],
            iat=payload["iat"]
        )
    except JWTError:
        return None


def verify_refresh_token_hash(token: str, stored_hash: str) -> bool:
    """Verify a refresh token against its stored hash."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return secrets.compare_digest(token_hash, stored_hash)


async def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenPayload:
    """FastAPI dependency to get and verify the current user's token."""
    token = credentials.credentials
    payload = verify_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


def require_roles(*required_roles: str):
    """Dependency factory to require specific roles."""
    async def role_checker(
        token: TokenPayload = Depends(get_current_user_token)
    ) -> TokenPayload:
        user_roles = set(token.roles)
        required = set(required_roles)
        
        if not required.intersection(user_roles) and "admin" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return token
    
    return role_checker
