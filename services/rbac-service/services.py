"""Business logic services for RBAC."""

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, and_, text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import User, Role, RefreshToken, Organization, OrganizationMember, Invitation
from schemas import (
    UserCreate,
    UserUpdate,
    OAuthUserInfo,
    OrganizationCreate,
    OrganizationUpdate,
    AdminOverviewResponse,
    AdminUserSummary,
    AdminOrganizationSummary,
    AdminAuditLogEntry,
    InvitationResponse,
)
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


class OrganizationService:
    """Organization (company) management."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, owner: User, data: OrganizationCreate) -> Organization:
        """Create a new organization and add the owner as an admin member."""
        slug = data.slug or self._slugify(data.name)
        
        org = Organization(
            name=data.name,
            slug=slug,
            logo_url=data.logo_url,
        )
        self.db.add(org)
        await self.db.flush()
        await self.db.refresh(org)
        
        membership = OrganizationMember(
            organization_id=org.id,
            user_id=owner.id,
            role="owner",
        )
        self.db.add(membership)
        await self.db.flush()
        
        return org
    
    async def list_for_user(self, user_id: UUID) -> list[Organization]:
        """List organizations the user belongs to."""
        result = await self.db.execute(
            select(Organization)
            .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
            .where(OrganizationMember.user_id == user_id)
            .order_by(Organization.created_at.desc())
        )
        return list(result.scalars().all())
    
    async def get_by_id(self, org_id: UUID) -> Optional[Organization]:
        result = await self.db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        return result.scalar_one_or_none()
    
    async def list_members(self, org_id: UUID) -> list[OrganizationMember]:
        result = await self.db.execute(
            select(OrganizationMember)
            .options(selectinload(OrganizationMember.user))
            .where(OrganizationMember.organization_id == org_id)
            .order_by(OrganizationMember.joined_at.asc())
        )
        return list(result.scalars().all())
    
    async def add_member(self, org: Organization, user: User, role: str = "member") -> OrganizationMember:
        existing = await self.db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.user_id == user.id,
            )
        )
        membership = existing.scalar_one_or_none()
        if membership:
            membership.role = role
            await self.db.flush()
            await self.db.refresh(membership)
            return membership
        
        membership = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role=role,
        )
        self.db.add(membership)
        await self.db.flush()
        await self.db.refresh(membership)
        return membership
    
    async def remove_member(self, org_id: UUID, user_id: UUID) -> bool:
        result = await self.db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
            )
        )
        membership = result.scalar_one_or_none()
        if membership is None:
            return False
        
        await self.db.delete(membership)
        await self.db.flush()
        return True

    async def update(self, org: Organization, data: OrganizationUpdate) -> Organization:
        """Update organization fields. Only provided fields are updated."""
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(org, key):
                setattr(org, key, value)
        await self.db.flush()
        await self.db.refresh(org)
        return org
    
    def _slugify(self, name: str) -> str:
        base = "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-")
        # Fallback if name becomes empty
        return base or "org"


class AdminService:
    """Admin-facing queries and aggregation."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_overview(self) -> AdminOverviewResponse:
        # Core counts from PostgreSQL
        total_users = await self._scalar_int("SELECT COUNT(*) FROM users")
        total_orgs = await self._scalar_int("SELECT COUNT(*) FROM organizations")
        total_links = await self._scalar_int("SELECT COUNT(*) FROM links")
        total_campaigns = await self._scalar_int("SELECT COUNT(*) FROM campaigns")
        total_qr = await self._scalar_int("SELECT COUNT(*) FROM qr_codes")
        total_clicks = await self._scalar_int("SELECT COALESCE(SUM(click_count), 0) FROM links")
        
        return AdminOverviewResponse(
            total_users=total_users,
            total_organizations=total_orgs,
            total_links=total_links,
            total_campaigns=total_campaigns,
            total_qr_codes=total_qr,
            total_clicks=total_clicks,
        )
    
    async def list_users(self, page: int = 1, page_size: int = 20) -> tuple[List[AdminUserSummary], int]:
        offset = (page - 1) * page_size
        total_result = await self.db.execute(text("SELECT COUNT(*) FROM users"))
        total = int(total_result.scalar_one())
        
        result = await self.db.execute(
            text(
                "SELECT id, email, created_at, campaign_count, link_count, qr_count, total_clicks "
                "FROM user_stats "
                "ORDER BY created_at DESC "
                "LIMIT :limit OFFSET :offset"
            ),
            {"limit": page_size, "offset": offset},
        )
        rows = result.fetchall()
        items = [
            AdminUserSummary(
                id=row[0],
                email=row[1],
                created_at=row[2],
                campaign_count=row[3],
                link_count=row[4],
                qr_count=row[5],
                total_clicks=row[6],
            )
            for row in rows
        ]
        return items, total
    
    async def list_organizations(self, page: int = 1, page_size: int = 20) -> tuple[List[AdminOrganizationSummary], int]:
        offset = (page - 1) * page_size
        
        total_result = await self.db.execute(text("SELECT COUNT(*) FROM organizations"))
        total = int(total_result.scalar_one())
        
        orgs_result = await self.db.execute(
            select(Organization).order_by(Organization.created_at.desc()).limit(page_size).offset(offset)
        )
        orgs = list(orgs_result.scalars().all())
        
        summaries: List[AdminOrganizationSummary] = []
        for org in orgs:
            members_count = await self._scalar_int(
                "SELECT COUNT(*) FROM organization_members WHERE organization_id = :org_id",
                {"org_id": org.id},
            )
            link_count = await self._scalar_int(
                "SELECT COUNT(*) FROM links WHERE organization_id = :org_id",
                {"org_id": org.id},
            )
            qr_count = await self._scalar_int(
                "SELECT COUNT(*) FROM qr_codes q JOIN links l ON q.link_id = l.id WHERE l.organization_id = :org_id",
                {"org_id": org.id},
            )
            total_clicks = await self._scalar_int(
                "SELECT COALESCE(SUM(click_count), 0) FROM links WHERE organization_id = :org_id",
                {"org_id": org.id},
            )
            
            summaries.append(
                AdminOrganizationSummary(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    plan_type=org.plan_type,
                    is_active=org.is_active,
                    status=org.status,
                    created_at=org.created_at,
                    members_count=members_count,
                    link_count=link_count,
                    qr_count=qr_count,
                    total_clicks=total_clicks,
                )
            )
        
        return summaries, total
    
    async def _scalar_int(self, sql: str, params: Optional[dict] = None) -> int:
        result = await self.db.execute(text(sql), params or {})
        value = result.scalar_one()
        return int(value or 0)

    async def list_audit_logs(
        self,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[List[AdminAuditLogEntry], int]:
        """List admin audit log entries."""
        offset = (page - 1) * page_size
        total_result = await self.db.execute(text("SELECT COUNT(*) FROM admin_audit_logs"))
        total = int(total_result.scalar_one() or 0)
        
        result = await self.db.execute(
            text(
                "SELECT id, admin_user_id, organization_id, action, details, created_at "
                "FROM admin_audit_logs "
                "ORDER BY created_at DESC "
                "LIMIT :limit OFFSET :offset"
            ),
            {"limit": page_size, "offset": offset},
        )
        rows = result.fetchall()
        items = [
            AdminAuditLogEntry(
                id=row[0],
                admin_user_id=row[1],
                organization_id=row[2],
                action=row[3],
                details=row[4] or {},
                created_at=row[5],
            )
            for row in rows
        ]
        return items, total


class InvitationService:
    """Organization invitation management."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_invitation(
        self,
        organization: Organization,
        email: str,
        role: str = "member",
        expires_in_hours: int = 48,
    ) -> Invitation:
        """Create a new invitation for an organization member."""
        import secrets
        
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        
        invitation = Invitation(
            organization_id=organization.id,
            email=email.lower(),
            role=role,
            invite_token=token,
            status="pending",
            expires_at=expires_at,
        )
        self.db.add(invitation)
        await self.db.flush()
        await self.db.refresh(invitation)
        return invitation
    
    async def get_valid_by_token(self, token: str) -> Optional[Invitation]:
        """Return a pending, unexpired invitation by raw token."""
        result = await self.db.execute(
            select(Invitation).where(
                Invitation.invite_token == token,
                Invitation.status == "pending",
                Invitation.expires_at > datetime.utcnow(),
            )
        )
        return result.scalar_one_or_none()
    
    async def mark_accepted(self, invitation: Invitation) -> None:
        invitation.status = "accepted"
        invitation.accepted_at = datetime.utcnow()
        await self.db.flush()
    
    async def revoke(self, invitation: Invitation, status: str = "revoked") -> None:
        invitation.status = status
        invitation.revoked_at = datetime.utcnow()
        await self.db.flush()
