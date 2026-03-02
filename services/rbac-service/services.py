"""Business logic services for RBAC."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import User, Role, RefreshToken
from schemas import UserCreate, UserUpdate, OAuthUserInfo
from auth import hash_password, verify_password, create_access_token, create_refresh_token, verify_refresh_token_hash


class UserService:
    """User management service."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles))
            .where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_by_oauth(self, provider: str, oauth_id: str) -> Optional[User]:
        """Get user by OAuth provider and ID."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles))
            .where(
                and_(
                    User.oauth_provider == provider,
                    User.oauth_id == oauth_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def create(self, data: UserCreate) -> User:
        """Create a new user."""
        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
        )
        
        # Assign default role
        default_role = await self._get_default_role()
        if default_role:
            user.roles.append(default_role)
        
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        
        return user
    
    async def create_oauth_user(self, data: OAuthUserInfo) -> User:
        """Create a user from OAuth data."""
        user = User(
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            avatar_url=data.avatar_url,
            oauth_provider=data.provider,
            oauth_id=data.oauth_id,
            is_verified=True,
        )
        
        # Assign default role
        default_role = await self._get_default_role()
        if default_role:
            user.roles.append(default_role)
        
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        
        return user
    
    async def update(self, user: User, data: UserUpdate) -> User:
        """Update user profile."""
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)
        
        await self.db.flush()
        await self.db.refresh(user)
        
        return user
    
    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password."""
        user = await self.get_by_email(email)
        
        if user is None:
            return None
        
        if user.password_hash is None:
            return None
        
        if not verify_password(password, user.password_hash):
            return None
        
        if not user.is_active:
            return None
        
        return user
    
    async def assign_role(self, user: User, role_id: UUID) -> bool:
        """Assign a role to a user."""
        result = await self.db.execute(
            select(Role).where(Role.id == role_id)
        )
        role = result.scalar_one_or_none()
        
        if role is None:
            return False
        
        if role not in user.roles:
            user.roles.append(role)
            await self.db.flush()
        
        return True
    
    async def remove_role(self, user: User, role_id: UUID) -> bool:
        """Remove a role from a user."""
        result = await self.db.execute(
            select(Role).where(Role.id == role_id)
        )
        role = result.scalar_one_or_none()
        
        if role is None:
            return False
        
        if role in user.roles:
            user.roles.remove(role)
            await self.db.flush()
        
        return True
    
    async def _get_default_role(self) -> Optional[Role]:
        """Get the default role for new users."""
        result = await self.db.execute(
            select(Role).where(Role.name == "marketing_user")
        )
        return result.scalar_one_or_none()


class TokenService:
    """Token management service."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_tokens(self, user: User) -> dict:
        """Create access and refresh tokens for a user."""
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            roles=user.role_names
        )
        
        refresh_token, token_hash, expires_at = create_refresh_token(user.id)
        
        # Store refresh token
        db_token = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        self.db.add(db_token)
        await self.db.flush()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 30 * 60  # 30 minutes in seconds
        }
    
    async def refresh_tokens(self, refresh_token: str) -> Optional[dict]:
        """Refresh access token using refresh token."""
        # Find valid refresh token
        result = await self.db.execute(
            select(RefreshToken)
            .options(selectinload(RefreshToken.user).selectinload(User.roles))
            .where(RefreshToken.revoked_at.is_(None))
        )
        tokens = result.scalars().all()
        
        valid_token = None
        for token in tokens:
            if verify_refresh_token_hash(refresh_token, token.token_hash):
                if token.expires_at > datetime.utcnow():
                    valid_token = token
                break
        
        if valid_token is None:
            return None
        
        # Revoke old refresh token
        valid_token.revoked_at = datetime.utcnow()
        
        # Create new tokens
        return await self.create_tokens(valid_token.user)
    
    async def revoke_all_tokens(self, user_id: UUID) -> None:
        """Revoke all refresh tokens for a user."""
        result = await self.db.execute(
            select(RefreshToken)
            .where(
                and_(
                    RefreshToken.user_id == user_id,
                    RefreshToken.revoked_at.is_(None)
                )
            )
        )
        tokens = result.scalars().all()
        
        for token in tokens:
            token.revoked_at = datetime.utcnow()
        
        await self.db.flush()


class RoleService:
    """Role management service."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all(self) -> list[Role]:
        """Get all roles."""
        result = await self.db.execute(select(Role))
        return list(result.scalars().all())
    
    async def get_by_id(self, role_id: UUID) -> Optional[Role]:
        """Get role by ID."""
        result = await self.db.execute(
            select(Role).where(Role.id == role_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_name(self, name: str) -> Optional[Role]:
        """Get role by name."""
        result = await self.db.execute(
            select(Role).where(Role.name == name)
        )
        return result.scalar_one_or_none()
