"""Business logic services for Link service."""

import secrets
from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from passlib.context import CryptContext

from models import Link, Tag
from schemas import LinkCreate, LinkUpdate
from config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def generate_short_code(length: int = 7) -> str:
    """Generate a random short code."""
    return ''.join(secrets.choice(BASE62_CHARS) for _ in range(length))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


class LinkService:
    """Link management service."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, link_id: UUID, user_id: Optional[UUID] = None) -> Optional[Link]:
        """Get link by ID, optionally filtered by user."""
        query = select(Link).options(selectinload(Link.qr_codes)).where(Link.id == link_id)
        
        if user_id:
            query = query.where(Link.user_id == user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_short_code(self, short_code: str) -> Optional[Link]:
        """Get link by short code."""
        result = await self.db.execute(
            select(Link)
            .options(selectinload(Link.qr_codes))
            .where(Link.short_code == short_code)
        )
        return result.scalar_one_or_none()
    
    async def list_by_user(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        campaign_id: Optional[UUID] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Link], int]:
        """List links for a user with pagination and filters."""
        query = (
            select(Link)
            .options(selectinload(Link.qr_codes))
            .where(Link.user_id == user_id)
            .order_by(Link.created_at.desc())
        )
        
        if campaign_id:
            query = query.where(Link.campaign_id == campaign_id)
        
        if is_active is not None:
            query = query.where(Link.is_active == is_active)
        
        if search:
            search_filter = or_(
                Link.title.ilike(f"%{search}%"),
                Link.destination_url.ilike(f"%{search}%"),
                Link.short_code.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
        
        # Get total count
        count_query = select(func.count(Link.id)).where(Link.user_id == user_id)
        if campaign_id:
            count_query = count_query.where(Link.campaign_id == campaign_id)
        if is_active is not None:
            count_query = count_query.where(Link.is_active == is_active)
        if search:
            count_query = count_query.where(search_filter)
        
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await self.db.execute(query)
        links = list(result.scalars().all())
        
        return links, total
    
    async def create(self, user_id: UUID, data: LinkCreate) -> Link:
        """Create a new short link."""
        # Generate or validate short code
        if data.custom_code:
            existing = await self.get_by_short_code(data.custom_code)
            if existing:
                raise ValueError("Short code already exists")
            short_code = data.custom_code
        else:
            short_code = await self._generate_unique_code()
        
        # Hash password if provided
        password_hash = None
        if data.password:
            password_hash = hash_password(data.password)
        
        # Resolve organization scoping: ensure the user belongs to the organization
        organization_id = await self._resolve_organization_id(user_id, data.organization_id)
        
        link = Link(
            user_id=user_id,
            campaign_id=data.campaign_id,
            organization_id=organization_id,
            short_code=short_code,
            destination_url=data.destination_url,
            title=data.title,
            description=data.description,
            expires_at=data.expires_at,
            password_hash=password_hash,
            max_clicks=data.max_clicks,
            extra_data=data.metadata
        )
        
        self.db.add(link)
        await self.db.flush()
        await self.db.refresh(link)
        
        return link
    
    async def update(self, link: Link, data: LinkUpdate) -> Link:
        """Update a link."""
        update_data = data.model_dump(exclude_unset=True)
        
        # Organization is immutable from the API surface
        update_data.pop("organization_id", None)
        
        # Handle password separately
        if 'password' in update_data:
            password = update_data.pop('password')
            if password:
                link.password_hash = hash_password(password)
            else:
                link.password_hash = None
        
        for key, value in update_data.items():
            setattr(link, key, value)
        
        await self.db.flush()
        await self.db.refresh(link)
        
        return link
    
    async def delete(self, link: Link) -> None:
        """Delete a link."""
        await self.db.delete(link)
        await self.db.flush()
    
    async def deactivate(self, link: Link) -> Link:
        """Soft delete (deactivate) a link."""
        link.is_active = False
        await self.db.flush()
        await self.db.refresh(link)
        return link
    
    async def increment_click_count(self, link_id: UUID) -> None:
        """Increment click count for a link."""
        result = await self.db.execute(
            select(Link).where(Link.id == link_id)
        )
        link = result.scalar_one_or_none()
        if link:
            link.click_count += 1
            await self.db.flush()
    
    async def _generate_unique_code(self, max_attempts: int = 10) -> str:
        """Generate a unique short code."""
        for _ in range(max_attempts):
            code = generate_short_code(settings.short_code_length)
            existing = await self.get_by_short_code(code)
            if not existing:
                return code
        
        raise ValueError("Failed to generate unique short code")

    async def _resolve_organization_id(
        self,
        user_id: UUID,
        requested_org_id: Optional[UUID],
    ) -> Optional[UUID]:
        """
        Resolve which organization a new link should belong to.
        
        - If the caller passes an organization_id, ensure the user is a member.
        - Otherwise, fall back to the user's first organization membership (if any).
        """
        if requested_org_id:
            result = await self.db.execute(
                text(
                    "SELECT role FROM organization_members "
                    "WHERE organization_id = :org_id AND user_id = :user_id"
                ),
                {"org_id": requested_org_id, "user_id": user_id},
            )
            role = result.scalar_one_or_none()
            if role is None:
                raise ValueError("You do not belong to the specified organization")
            return requested_org_id
        
        # Default: first organization the user belongs to, if any
        result = await self.db.execute(
            text(
                "SELECT organization_id FROM organization_members "
                "WHERE user_id = :user_id "
                "ORDER BY joined_at ASC LIMIT 1"
            ),
            {"user_id": user_id},
        )
        return result.scalar_one_or_none()


class TagService:
    """Tag management service."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_user(self, user_id: UUID) -> List[Tag]:
        """Get all tags for a user."""
        result = await self.db.execute(
            select(Tag)
            .where(Tag.user_id == user_id)
            .order_by(Tag.name)
        )
        return list(result.scalars().all())
    
    async def create(self, user_id: UUID, name: str, color: str = "#6366f1") -> Tag:
        """Create a new tag."""
        tag = Tag(
            user_id=user_id,
            name=name,
            color=color
        )
        self.db.add(tag)
        await self.db.flush()
        await self.db.refresh(tag)
        return tag
    
    async def delete(self, tag: Tag) -> None:
        """Delete a tag."""
        await self.db.delete(tag)
        await self.db.flush()
