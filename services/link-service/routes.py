"""API routes for Link service."""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import (
    LinkCreate, LinkUpdate, LinkResponse, LinkListResponse,
    LinkStatsResponse, TagCreate, TagResponse
)
from auth import get_current_user_token, get_current_user_id, TokenPayload
from services import LinkService, TagService
from analytics import LinkAnalytics
from config import get_settings

settings = get_settings()
router = APIRouter()


def make_short_url(short_code: str) -> str:
    """Generate full short URL from code."""
    return f"{settings.short_domain}/{short_code}"


def link_to_response(link) -> LinkResponse:
    """Convert Link model to response schema."""
    return LinkResponse(
        id=link.id,
        campaign_id=link.campaign_id,
        user_id=link.user_id,
        organization_id=getattr(link, "organization_id", None),
        short_code=link.short_code,
        short_url=make_short_url(link.short_code),
        destination_url=link.destination_url,
        title=link.title,
        description=link.description,
        is_active=link.is_active,
        expires_at=link.expires_at,
        max_clicks=link.max_clicks,
        click_count=link.click_count,
        has_password=link.has_password,
        has_qr=link.has_qr,
        metadata=link.extra_data,
        created_at=link.created_at,
        updated_at=link.updated_at
    )


@router.post("", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
async def create_link(
    data: LinkCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new short link."""
    service = LinkService(db)
    
    try:
        link = await service.create(user_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    return link_to_response(link)


@router.get("", response_model=LinkListResponse)
async def list_links(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    campaign_id: Optional[UUID] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List links for the current user."""
    service = LinkService(db)
    
    links, total = await service.list_by_user(
        user_id=user_id,
        page=page,
        page_size=page_size,
        campaign_id=campaign_id,
        search=search,
        is_active=is_active
    )
    
    return LinkListResponse(
        items=[link_to_response(link) for link in links],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{link_id}", response_model=LinkResponse)
async def get_link(
    link_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific link."""
    service = LinkService(db)
    
    link = await service.get_by_id(link_id, user_id)
    
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )
    
    return link_to_response(link)


@router.put("/{link_id}", response_model=LinkResponse)
async def update_link(
    link_id: UUID,
    data: LinkUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update a link."""
    service = LinkService(db)
    
    link = await service.get_by_id(link_id, user_id)
    
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )
    
    try:
        link = await service.update(link, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    return link_to_response(link)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    link_id: UUID,
    permanent: bool = False,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a link (soft delete by default)."""
    service = LinkService(db)
    
    link = await service.get_by_id(link_id, user_id)
    
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )
    
    if permanent:
        await service.delete(link)
    else:
        await service.deactivate(link)


@router.get("/{link_id}/stats", response_model=LinkStatsResponse)
async def get_link_stats(
    link_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics stats for a link."""
    service = LinkService(db)
    
    link = await service.get_by_id(link_id, user_id)
    
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )
    
    analytics = LinkAnalytics()
    stats = analytics.get_link_stats(link_id)
    
    return LinkStatsResponse(**stats)


# ===========================================
# Tags Endpoints
# ===========================================

@router.get("/tags/all", response_model=list[TagResponse])
async def list_tags(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all tags for the current user."""
    service = TagService(db)
    tags = await service.get_by_user(user_id)
    
    return [
        TagResponse(
            id=tag.id,
            name=tag.name,
            color=tag.color,
            created_at=tag.created_at
        )
        for tag in tags
    ]


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new tag."""
    service = TagService(db)
    tag = await service.create(user_id, data.name, data.color)
    
    return TagResponse(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        created_at=tag.created_at
    )
