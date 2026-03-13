from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignDetailResponse,
    CampaignListResponse, LinkSummary,
    StoreCreate, StoreUpdate, StoreResponse
)
from auth import get_current_user_id
from services import CampaignService, StoreService

router = APIRouter()


def campaign_to_response(campaign, include_links: bool = False):
    response_data = {
        "id": campaign.id,
        "user_id": campaign.user_id,
        "organization_id": getattr(campaign, "organization_id", None),
        "store_id": campaign.store_id,
        "name": campaign.name,
        "description": campaign.description,
        "status": campaign.status,
        "start_date": campaign.start_date,
        "end_date": campaign.end_date,
        "metadata": campaign.extra_data,
        "link_count": campaign.link_count,
        "total_clicks": campaign.total_clicks,
        "created_at": campaign.created_at,
        "updated_at": campaign.updated_at
    }
    
    if include_links:
        response_data["links"] = [
            LinkSummary(
                id=link.id,
                short_code=link.short_code,
                destination_url=link.destination_url,
                title=link.title,
                is_active=link.is_active,
                click_count=link.click_count,
                created_at=link.created_at
            )
            for link in campaign.links
        ]
        return CampaignDetailResponse(**response_data)
    
    return CampaignResponse(**response_data)


# ===========================================
# Campaign Endpoints
# ===========================================

@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = CampaignService(db)
    try:
        campaign = await service.create(user_id, data)
        return campaign_to_response(campaign)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("", response_model=CampaignListResponse)
async def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = CampaignService(db)
    
    campaigns, total = await service.list_by_user(
        user_id=user_id,
        page=page,
        page_size=page_size,
        status=status,
        search=search
    )
    
    return CampaignListResponse(
        items=[campaign_to_response(c) for c in campaigns],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign(
    campaign_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = CampaignService(db)
    
    campaign = await service.get_by_id(campaign_id, user_id)
    
    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    return campaign_to_response(campaign, include_links=True)


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    data: CampaignUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = CampaignService(db)
    
    campaign = await service.get_by_id(campaign_id, user_id)
    
    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    campaign = await service.update(campaign, data)
    
    return campaign_to_response(campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: UUID,
    permanent: bool = False,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = CampaignService(db)
    
    campaign = await service.get_by_id(campaign_id, user_id)
    
    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    if permanent:
        await service.delete(campaign)
    else:
        await service.archive(campaign)


# ===========================================
# Store Endpoints
# ===========================================

@router.post("/stores", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(
    data: StoreCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = StoreService(db)
    store = await service.create(user_id, data)
    
    return StoreResponse(
        id=store.id,
        user_id=store.user_id,
        organization_id=getattr(store, "organization_id", None),
        name=store.name,
        description=store.description,
        location=store.location,
        metadata=store.extra_data,
        is_active=store.is_active,
        created_at=store.created_at,
        updated_at=store.updated_at
    )


@router.get("/stores", response_model=list[StoreResponse])
async def list_stores(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = StoreService(db)
    stores = await service.list_by_user(user_id)
    
    return [
        StoreResponse(
            id=store.id,
            user_id=store.user_id,
            organization_id=getattr(store, "organization_id", None),
            name=store.name,
            description=store.description,
            location=store.location,
            metadata=store.extra_data,
            is_active=store.is_active,
            created_at=store.created_at,
            updated_at=store.updated_at
        )
        for store in stores
    ]


@router.get("/stores/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = StoreService(db)
    
    store = await service.get_by_id(store_id, user_id)
    
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    return StoreResponse(
        id=store.id,
        user_id=store.user_id,
        organization_id=getattr(store, "organization_id", None),
        name=store.name,
        description=store.description,
        location=store.location,
        metadata=store.extra_data,
        is_active=store.is_active,
        created_at=store.created_at,
        updated_at=store.updated_at
    )


@router.put("/stores/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: UUID,
    data: StoreUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = StoreService(db)
    
    store = await service.get_by_id(store_id, user_id)
    
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    store = await service.update(store, data)
    
    return StoreResponse(
        id=store.id,
        user_id=store.user_id,
        organization_id=getattr(store, "organization_id", None),
        name=store.name,
        description=store.description,
        location=store.location,
        metadata=store.extra_data,
        is_active=store.is_active,
        created_at=store.created_at,
        updated_at=store.updated_at
    )


@router.delete("/stores/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(
    store_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = StoreService(db)
    
    store = await service.get_by_id(store_id, user_id)
    
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    await service.delete(store)
