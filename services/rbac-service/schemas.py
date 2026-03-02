"""Pydantic schemas for RBAC service."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator


class BaseSchema(BaseModel):
    class Config:
        from_attributes = True


# ===========================================
# User Schemas
# ===========================================

class UserCreate(BaseSchema):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseSchema):
    id: UUID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: List[str] = []


# ===========================================
# Auth Schemas
# ===========================================

class LoginRequest(BaseSchema):
    email: EmailStr
    password: str


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefreshRequest(BaseSchema):
    refresh_token: str


class TokenPayload(BaseSchema):
    sub: str
    email: str
    roles: List[str]
    exp: int
    iat: int


# ===========================================
# Role Schemas
# ===========================================

class RoleResponse(BaseSchema):
    id: UUID
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    created_at: datetime


class RoleAssignment(BaseSchema):
    role_id: UUID


# ===========================================
# OAuth Schemas
# ===========================================

class OAuthUserInfo(BaseSchema):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    oauth_id: str
    provider: str
