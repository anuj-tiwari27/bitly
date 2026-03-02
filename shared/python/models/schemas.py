"""Pydantic schemas for API request/response validation."""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator


# ===========================================
# Enums
# ===========================================

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class RoleName(str, Enum):
    ADMIN = "admin"
    MARKETING_USER = "marketing_user"
    STORE_MANAGER = "store_manager"


# ===========================================
# Base Schemas
# ===========================================

class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


# ===========================================
# User Schemas
# ===========================================

class UserBase(BaseSchema):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    
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


class UserResponse(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: List[str] = []


class UserInDB(UserBase):
    id: UUID
    password_hash: Optional[str] = None
    oauth_provider: Optional[str] = None
    oauth_id: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


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
    sub: str  # user_id
    email: str
    roles: List[str]
    exp: int
    iat: int


class OAuthCallback(BaseSchema):
    code: str
    state: Optional[str] = None


# ===========================================
# Role Schemas
# ===========================================

class RoleBase(BaseSchema):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []


class RoleResponse(RoleBase):
    id: UUID
    created_at: datetime


class RoleAssignment(BaseSchema):
    role_id: UUID


# ===========================================
# Store Schemas
# ===========================================

class StoreBase(BaseSchema):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    metadata: dict = {}


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    metadata: Optional[dict] = None
    is_active: Optional[bool] = None


class StoreResponse(StoreBase):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ===========================================
# Campaign Schemas
# ===========================================

class CampaignBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: CampaignStatus = CampaignStatus.DRAFT
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: dict = {}


class CampaignCreate(CampaignBase):
    store_id: Optional[UUID] = None


class CampaignUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None
    store_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: Optional[dict] = None


class CampaignResponse(CampaignBase):
    id: UUID
    user_id: UUID
    store_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    link_count: int = 0
    total_clicks: int = 0


class CampaignListResponse(BaseSchema):
    items: List[CampaignResponse]
    total: int
    page: int
    page_size: int


# ===========================================
# Link Schemas
# ===========================================

class LinkBase(BaseSchema):
    destination_url: str = Field(..., min_length=1)
    title: Optional[str] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    password: Optional[str] = None
    max_clicks: Optional[int] = None
    metadata: dict = {}


class LinkCreate(LinkBase):
    campaign_id: Optional[UUID] = None
    custom_code: Optional[str] = Field(None, min_length=3, max_length=20)
    
    @field_validator('destination_url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(('http://', 'https://')):
            v = 'https://' + v
        return v


class LinkUpdate(BaseSchema):
    destination_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    campaign_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None
    password: Optional[str] = None
    max_clicks: Optional[int] = None
    metadata: Optional[dict] = None


class LinkResponse(LinkBase):
    id: UUID
    campaign_id: Optional[UUID] = None
    user_id: UUID
    short_code: str
    short_url: str
    is_active: bool
    click_count: int
    created_at: datetime
    updated_at: datetime
    has_password: bool = False
    has_qr: bool = False


class LinkListResponse(BaseSchema):
    items: List[LinkResponse]
    total: int
    page: int
    page_size: int


class LinkStatsResponse(BaseSchema):
    link_id: UUID
    total_clicks: int
    unique_visitors: int
    clicks_today: int
    clicks_this_week: int
    clicks_this_month: int
    top_countries: List[dict]
    top_referrers: List[dict]
    device_breakdown: dict
    browser_breakdown: dict
    clicks_over_time: List[dict]


# ===========================================
# QR Code Schemas
# ===========================================

class QRStyleConfig(BaseSchema):
    fill_color: str = "#000000"
    back_color: str = "#FFFFFF"
    box_size: int = Field(default=10, ge=1, le=50)
    border: int = Field(default=4, ge=0, le=20)
    logo_url: Optional[str] = None


class QRCodeCreate(BaseSchema):
    link_id: UUID
    style_config: QRStyleConfig = QRStyleConfig()
    file_format: str = Field(default="png", pattern="^(png|svg)$")


class QRCodeUpdate(BaseSchema):
    style_config: Optional[QRStyleConfig] = None


class QRCodeResponse(BaseSchema):
    id: UUID
    link_id: UUID
    file_format: str
    style_config: QRStyleConfig
    download_url: str
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime
    updated_at: datetime


# ===========================================
# Tag Schemas
# ===========================================

class TagBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern="^#[0-9A-Fa-f]{6}$")


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: UUID
    user_id: UUID
    created_at: datetime


# ===========================================
# Click Event Schemas
# ===========================================

class ClickEvent(BaseSchema):
    link_id: UUID
    campaign_id: Optional[UUID] = None
    store_id: Optional[UUID] = None
    short_code: str
    destination_url: str
    timestamp: datetime
    ip_hash: str
    user_agent: str
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None


class ClickEventEnriched(ClickEvent):
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    device_type: Optional[str] = None
    device_brand: Optional[str] = None
    device_model: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    browser_name: Optional[str] = None
    browser_version: Optional[str] = None
    is_bot: bool = False


# ===========================================
# Analytics Schemas
# ===========================================

class AnalyticsOverview(BaseSchema):
    total_clicks: int
    unique_visitors: int
    total_links: int
    active_campaigns: int
    clicks_today: int
    clicks_change_percent: float


class TimeSeriesPoint(BaseSchema):
    timestamp: datetime
    value: int


class AnalyticsTimeSeries(BaseSchema):
    data: List[TimeSeriesPoint]
    granularity: str  # hour, day, week, month


class GeoAnalytics(BaseSchema):
    country_code: str
    country_name: str
    clicks: int
    unique_visitors: int


class DeviceAnalytics(BaseSchema):
    device_type: str
    clicks: int
    percentage: float


class ReferrerAnalytics(BaseSchema):
    referrer_domain: str
    clicks: int
    percentage: float


class CampaignAnalytics(BaseSchema):
    campaign_id: UUID
    campaign_name: str
    total_clicks: int
    unique_visitors: int
    link_count: int
    conversion_rate: Optional[float] = None


# ===========================================
# Pagination & Common Schemas
# ===========================================

class PaginationParams(BaseSchema):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class SortParams(BaseSchema):
    sort_by: str = "created_at"
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")


class SuccessResponse(BaseSchema):
    success: bool = True
    message: str


class ErrorResponse(BaseSchema):
    success: bool = False
    error: str
    detail: Optional[Any] = None
