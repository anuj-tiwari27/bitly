from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import Campaign, Store
from schemas import CampaignCreate, CampaignUpdate, StoreCreate, StoreUpdate


class CampaignService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, campaign_id: UUID, user_id: Optional[UUID] = None) -> Optional[Campaign]:
        query = (
            select(Campaign)
            .options(selectinload(Campaign.links), selectinload(Campaign.store))
            .where(Campaign.id == campaign_id)
        )
        
        if user_id:
            query = query.where(Campaign.user_id == user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def list_by_user(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Campaign], int]:
        query = (
            select(Campaign)
            .options(selectinload(Campaign.links))
            .where(Campaign.user_id == user_id)
            .order_by(Campaign.created_at.desc())
        )
        
        if status:
            query = query.where(Campaign.status == status)
        
        if search:
            search_filter = or_(
                Campaign.name.ilike(f"%{search}%"),
                Campaign.description.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
        
        # Count total
        count_query = select(func.count(Campaign.id)).where(Campaign.user_id == user_id)
        if status:
            count_query = count_query.where(Campaign.status == status)
        if search:
            count_query = count_query.where(search_filter)
        
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Paginate
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await self.db.execute(query)
        campaigns = list(result.scalars().all())
        
        return campaigns, total
    
    async def create(self, user_id: UUID, data: CampaignCreate) -> Campaign:
        campaign = Campaign(
            user_id=user_id,
            store_id=data.store_id,
            name=data.name,
            description=data.description,
            status=data.status.value,
            start_date=data.start_date,
            end_date=data.end_date,
            extra_data=data.metadata
        )
        
        self.db.add(campaign)
        await self.db.flush()
        await self.db.refresh(campaign)
        
        return campaign
    
    async def update(self, campaign: Campaign, data: CampaignUpdate) -> Campaign:
        update_data = data.model_dump(exclude_unset=True)
        
        if 'status' in update_data and update_data['status']:
            update_data['status'] = update_data['status'].value
        
        for key, value in update_data.items():
            setattr(campaign, key, value)
        
        await self.db.flush()
        await self.db.refresh(campaign)
        
        return campaign
    
    async def delete(self, campaign: Campaign) -> None:
        await self.db.delete(campaign)
        await self.db.flush()
    
    async def archive(self, campaign: Campaign) -> Campaign:
        campaign.status = "archived"
        await self.db.flush()
        await self.db.refresh(campaign)
        return campaign


class StoreService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, store_id: UUID, user_id: Optional[UUID] = None) -> Optional[Store]:
        query = select(Store).where(Store.id == store_id)
        
        if user_id:
            query = query.where(Store.user_id == user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def list_by_user(self, user_id: UUID) -> List[Store]:
        result = await self.db.execute(
            select(Store)
            .where(Store.user_id == user_id, Store.is_active == True)
            .order_by(Store.name)
        )
        return list(result.scalars().all())
    
    async def create(self, user_id: UUID, data: StoreCreate) -> Store:
        store = Store(
            user_id=user_id,
            name=data.name,
            description=data.description,
            location=data.location,
            extra_data=data.metadata
        )
        
        self.db.add(store)
        await self.db.flush()
        await self.db.refresh(store)
        
        return store
    
    async def update(self, store: Store, data: StoreUpdate) -> Store:
        update_data = data.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(store, key, value)
        
        await self.db.flush()
        await self.db.refresh(store)
        
        return store
    
    async def delete(self, store: Store) -> None:
        store.is_active = False
        await self.db.flush()
