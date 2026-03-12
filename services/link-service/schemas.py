"""Pydantic schemas for Link service."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class BaseSchema(BaseModel):
    class Config:
        from_attributes = True


class LinkCreate(BaseSchema):
    destination_url: str = Field(..., min_length=1)
    title: Optional[str] = None
    description: Optional[str] = None
    campaign_id: Optional[UUID] = None
    custom_code: Optional[str] = Field(None, min_length=3, max_length=20)
    expires_at: Optional[datetime] = None
    password: Optional[str] = None
    max_clicks: Optional[int] = None
    metadata: dict = {}
    organization_id: Optional[UUID] = None
    
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
    organization_id: Optional[UUID] = None


class LinkResponse(BaseSchema):
    id: UUID
    campaign_id: Optional[UUID] = None
    user_id: UUID
    organization_id: Optional[UUID] = None
    short_code: str
    short_url: str
    destination_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    expires_at: Optional[datetime] = None
    max_clicks: Optional[int] = None
    click_count: int
    has_password: bool = False
    has_qr: bool = False
    metadata: dict = {}
    created_at: datetime
    updated_at: datetime


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


class TagCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern="^#[0-9A-Fa-f]{6}$")


class TagResponse(BaseSchema):
    id: UUID
    name: str
    color: str
    created_at: datetime
