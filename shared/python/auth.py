"""Authentication utilities - JWT and password hashing."""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from jose import jwt, JWTError
from passlib.context import CryptContext

from .config import get_settings
from .models.schemas import TokenPayload

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ===========================================
# Password Utilities
# ===========================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ===========================================
# Token Utilities
# ===========================================

def create_access_token(
    user_id: UUID,
    email: str,
    roles: list[str],
    expires_delta: timedelta | None = None
) -> str:
    """Create a JWT access token."""
    settings = get_settings()
    
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


def create_refresh_token(
    user_id: UUID,
    expires_delta: timedelta | None = None
) -> tuple[str, str]:
    """
    Create a refresh token.
    Returns (token, token_hash) - store the hash in DB, return token to user.
    """
    settings = get_settings()
    
    if expires_delta is None:
        expires_delta = timedelta(days=settings.jwt_refresh_expiry_days)
    
    # Generate a secure random token
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    return token, token_hash


def verify_access_token(token: str) -> Optional[TokenPayload]:
    """Verify and decode a JWT access token."""
    settings = get_settings()
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        
        # Check token type
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


def hash_ip_address(ip: str) -> str:
    """Hash an IP address for privacy-preserving analytics."""
    # Use a truncated hash for privacy
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


# ===========================================
# Link Password Utilities
# ===========================================

def hash_link_password(password: str) -> str:
    """Hash a link password."""
    return pwd_context.hash(password)


def verify_link_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a link password."""
    return pwd_context.verify(plain_password, hashed_password)


# ===========================================
# Short Code Generation
# ===========================================

# Base62 characters for short codes
BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def generate_short_code(length: int = 7) -> str:
    """Generate a random short code using base62 characters."""
    return ''.join(secrets.choice(BASE62_CHARS) for _ in range(length))


def is_valid_short_code(code: str) -> bool:
    """Check if a short code is valid (base62 characters only)."""
    return all(c in BASE62_CHARS for c in code)


# ===========================================
# FastAPI Dependencies
# ===========================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


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
    """
    FastAPI dependency factory to require specific roles.
    
    Usage:
        @router.get("/admin", dependencies=[Depends(require_roles("admin"))])
        async def admin_endpoint():
            ...
    """
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


def require_permission(permission: str):
    """
    FastAPI dependency factory to require a specific permission.
    This is a more granular check than roles.
    """
    async def permission_checker(
        token: TokenPayload = Depends(get_current_user_token)
    ) -> TokenPayload:
        # For now, we check roles which map to permissions
        # In a full implementation, you'd query the role's permissions
        if "admin" in token.roles:
            return token
        
        # Map permissions to roles
        permission_role_map = {
            "campaigns:read": ["marketing_user", "store_manager"],
            "campaigns:write": ["marketing_user"],
            "campaigns:delete": ["marketing_user"],
            "links:read": ["marketing_user", "store_manager"],
            "links:write": ["marketing_user"],
            "links:delete": ["marketing_user"],
            "analytics:read": ["marketing_user", "store_manager"],
            "users:read": [],
            "users:write": [],
            "roles:read": [],
            "roles:write": [],
        }
        
        allowed_roles = permission_role_map.get(permission, [])
        if not any(role in allowed_roles for role in token.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}"
            )
        
        return token
    
    return permission_checker
