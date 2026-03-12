"""Pydantic schemas for RBAC service."""

from datetime import datetime
from typing import Optional, List, Literal
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
    # Account / organization context
    account_type: Literal["individual", "organization"] = "individual"
    # Only used when account_type == "organization"
    organization_name: Optional[str] = None
    organization_website: Optional[str] = None
    organization_industry: Optional[str] = None
    organization_team_size: Optional[str] = None
    
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
# Organization Schemas
# ===========================================

class OrganizationCreate(BaseSchema):
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None


class OrganizationUpdate(BaseSchema):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    team_size: Optional[str] = None


class OrganizationMemberResponse(BaseSchema):
    user_id: UUID
    email: str
    role: str
    joined_at: datetime


class OrganizationResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    team_size: Optional[str] = None
    plan_type: str
    is_active: bool
    created_at: datetime
    members_count: int = 0


class InvitationCreate(BaseSchema):
    email: EmailStr
    role: str = "member"


class InvitationResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    email: str
    role: str
    status: str
    expires_at: datetime
    created_at: datetime


class InvitationAcceptRequest(BaseSchema):
    password: str = Field(..., min_length=8)
    first_name: Optional[str] = None
    last_name: Optional[str] = None


# ===========================================
# Admin Schemas
# ===========================================

class AdminOverviewResponse(BaseSchema):
    total_users: int
    total_organizations: int
    total_links: int
    total_campaigns: int
    total_qr_codes: int
    total_clicks: int


class AdminUserSummary(BaseSchema):
    id: UUID
    email: str
    created_at: datetime
    campaign_count: int
    link_count: int
    qr_count: int
    total_clicks: int


class AdminOrganizationSummary(BaseSchema):
    id: UUID
    name: str
    slug: str
    plan_type: str
    is_active: bool
    status: str
    created_at: datetime
    members_count: int
    link_count: int
    qr_count: int
    total_clicks: int


class AdminUserListResponse(BaseSchema):
    items: List[AdminUserSummary]
    total: int
    page: int
    page_size: int


class AdminOrganizationListResponse(BaseSchema):
    items: List[AdminOrganizationSummary]
    total: int
    page: int
    page_size: int


class AdminAuditLogEntry(BaseSchema):
    id: UUID
    admin_user_id: UUID
    organization_id: Optional[UUID] = None
    action: str
    details: dict
    created_at: datetime


class AdminAuditLogListResponse(BaseSchema):
    items: List[AdminAuditLogEntry]
    total: int
    page: int
    page_size: int


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
