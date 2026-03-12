from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class BaseSchema(BaseModel):
    class Config:
        from_attributes = True


class CampaignCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    store_id: Optional[UUID] = None
    status: CampaignStatus = CampaignStatus.DRAFT
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: dict = {}
    organization_id: Optional[UUID] = None


class CampaignUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    store_id: Optional[UUID] = None
    status: Optional[CampaignStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: Optional[dict] = None
    organization_id: Optional[UUID] = None


class LinkSummary(BaseSchema):
    id: UUID
    short_code: str
    destination_url: str
    title: Optional[str] = None
    is_active: bool
    click_count: int
    created_at: datetime


class CampaignResponse(BaseSchema):
    id: UUID
    user_id: UUID
    organization_id: Optional[UUID] = None
    store_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: dict = {}
    link_count: int = 0
    total_clicks: int = 0
    created_at: datetime
    updated_at: datetime


class CampaignDetailResponse(CampaignResponse):
    links: List[LinkSummary] = []


class CampaignListResponse(BaseSchema):
    items: List[CampaignResponse]
    total: int
    page: int
    page_size: int


# Store schemas
class StoreCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    metadata: dict = {}
    organization_id: Optional[UUID] = None


class StoreUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    metadata: Optional[dict] = None
    is_active: Optional[bool] = None
    organization_id: Optional[UUID] = None


class StoreResponse(BaseSchema):
    id: UUID
    user_id: UUID
    organization_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    metadata: dict = {}
    is_active: bool
    created_at: datetime
    updated_at: datetime
