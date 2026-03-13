"""API routes for RBAC service."""

from uuid import UUID
import json
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database import get_db
from schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    TokenRefreshRequest,
    RoleResponse,
    RoleAssignment,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationMemberResponse,
    InvitationCreate,
    InvitationResponse,
    InvitationAcceptRequest,
    AdminOverviewResponse,
    AdminUserSummary,
    AdminOrganizationSummary,
    AdminUserListResponse,
    AdminOrganizationListResponse,
    AdminAuditLogListResponse,
)
from auth import get_current_user_token, require_roles, TokenPayload
from services import (
    UserService,
    TokenService,
    RoleService,
    OrganizationService,
    AdminService,
    InvitationService,
)
from oauth import get_google_user_info, exchange_google_code
from config import get_settings

settings = get_settings()

# ===========================================
# Auth Router
# ===========================================

auth_router = APIRouter()


@auth_router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    user_service = UserService(db)
    token_service = TokenService(db)
    org_service = OrganizationService(db)
    
    # Check if user exists
    existing = await user_service.get_by_email(data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = await user_service.create(data)
    
    # Create default organization and membership based on account_type
    # Individual accounts get a personal org; organization accounts create a company org.
    if data.account_type == "organization":
        if not data.organization_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization name is required for organization registration",
            )
        org_create = OrganizationCreate(
            name=data.organization_name,
            slug=None,
            logo_url=None,
        )
        await org_service.create(user, org_create)
    else:
        # Individual account: create a simple personal organization
        base_name_parts = [data.first_name, data.last_name]
        base_name = " ".join(filter(None, base_name_parts)).strip()
        if not base_name:
            base_name = f"{data.email.split('@')[0]}'s Workspace"
        org_create = OrganizationCreate(
            name=base_name,
            slug=None,
            logo_url=None,
        )
        await org_service.create(user, org_create)
    
    # Generate tokens
    tokens = await token_service.create_tokens(user)
    
    return TokenResponse(**tokens)


@auth_router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login with email and password."""
    user_service = UserService(db)
    token_service = TokenService(db)
    
    user = await user_service.authenticate(data.email, data.password)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    tokens = await token_service.create_tokens(user)
    
    return TokenResponse(**tokens)


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token."""
    token_service = TokenService(db)
    
    tokens = await token_service.refresh_tokens(data.refresh_token)
    
    if tokens is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    return TokenResponse(**tokens)


@auth_router.post("/logout")
async def logout(
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Logout and revoke all tokens."""
    token_service = TokenService(db)
    
    await token_service.revoke_all_tokens(UUID(token.sub))
    
    return {"message": "Successfully logged out"}


@auth_router.get("/invites/{token}", response_model=InvitationResponse)
async def get_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get details about an invitation by token."""
    invitation_service = InvitationService(db)
    
    invitation = await invitation_service.get_valid_by_token(token)
    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or expired",
        )
    
    return InvitationResponse(
        id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
    )


@auth_router.post("/invites/{token}/accept", response_model=TokenResponse)
async def accept_invitation(
    token: str,
    data: InvitationAcceptRequest,
    db: AsyncSession = Depends(get_db),
):
    """Accept an invitation, creating a user if needed and joining the organization."""
    invitation_service = InvitationService(db)
    user_service = UserService(db)
    org_service = OrganizationService(db)
    token_service = TokenService(db)
    
    invitation = await invitation_service.get_valid_by_token(token)
    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or expired",
        )
    
    # Reuse password validation rules from UserCreate
    tmp = UserCreate(
        email=invitation.email,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    
    user = await user_service.get_by_email(invitation.email)
    if user is None:
        # Create a new user without creating a new organization
        user = await user_service.create(tmp)
    # If the user already exists, we do not overwrite their password here.
    
    # Ensure membership is created for this organization
    org = await org_service.get_by_id(invitation.organization_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    
    await org_service.add_member(org, user, role=invitation.role)
    await invitation_service.mark_accepted(invitation)

    # Notify organization owners/admins that a new member has joined.
    try:
        members = await org_service.list_members(org.id)
        admin_emails = [
            m.user.email
            for m in members
            if m.user and m.user.email and m.role in {"owner", "admin"}
        ]
        if admin_emails:
            subject, html = render_org_member_joined_email(
                org_name=org.name,
                member_email=user.email,
                role=invitation.role,
            )
            await send_email(to=admin_emails, subject=subject, html_body=html)
    except Exception:
        pass
    
    tokens = await token_service.create_tokens(user)
    return TokenResponse(**tokens)


@auth_router.get("/oauth/google")
async def google_oauth_redirect(request: Request):
    """Initiate Google OAuth flow."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    
    redirect_uri = settings.google_redirect_uri
    scope = "openid email profile"
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.google_client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline"
    )
    
    return RedirectResponse(url=auth_url)


@auth_router.get("/oauth/google/callback", response_model=TokenResponse)
async def google_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """Handle Google OAuth callback."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    
    # Exchange code for tokens
    token_data = await exchange_google_code(code, settings.google_redirect_uri)
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange authorization code"
        )
    
    # Get user info
    user_info = await get_google_user_info(token_data["access_token"])
    
    if user_info is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get user info from Google"
        )
    
    user_service = UserService(db)
    token_service = TokenService(db)
    
    # Check if user exists by OAuth ID
    user = await user_service.get_by_oauth("google", user_info.oauth_id)
    
    if user is None:
        # Check if user exists by email
        user = await user_service.get_by_email(user_info.email)
        
        if user is None:
            # Create new user
            user = await user_service.create_oauth_user(user_info)
        else:
            # Link OAuth to existing user
            user.oauth_provider = "google"
            user.oauth_id = user_info.oauth_id
            if not user.avatar_url and user_info.avatar_url:
                user.avatar_url = user_info.avatar_url
    
    tokens = await token_service.create_tokens(user)
    
    return TokenResponse(**tokens)


# ===========================================
# Users Router
# ===========================================

users_router = APIRouter()


@users_router.get("/me", response_model=UserResponse)
async def get_current_user(
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile."""
    user_service = UserService(db)
    
    user = await user_service.get_by_id(UUID(token.sub))
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        roles=user.role_names
    )


@users_router.put("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdate,
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile."""
    user_service = UserService(db)
    
    user = await user_service.get_by_id(UUID(token.sub))
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = await user_service.update(user, data)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        roles=user.role_names
    )


@users_router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID (admin only)."""
    user_service = UserService(db)
    
    user = await user_service.get_by_id(user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        roles=user.role_names
    )


@users_router.post("/{user_id}/roles", response_model=UserResponse)
async def assign_role_to_user(
    user_id: UUID,
    data: RoleAssignment,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Assign a role to a user (admin only)."""
    user_service = UserService(db)
    
    user = await user_service.get_by_id(user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    success = await user_service.assign_role(user, data.role_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        roles=user.role_names
    )


@users_router.delete("/{user_id}/roles/{role_id}", response_model=UserResponse)
async def remove_role_from_user(
    user_id: UUID,
    role_id: UUID,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Remove a role from a user (admin only)."""
    user_service = UserService(db)
    
    user = await user_service.get_by_id(user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    success = await user_service.remove_role(user, role_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        roles=user.role_names
    )


# ===========================================
# Roles Router
# ===========================================

roles_router = APIRouter()


@roles_router.get("", response_model=list[RoleResponse])
async def list_roles(
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """List all roles."""
    role_service = RoleService(db)
    
    roles = await role_service.get_all()
    
    return [
        RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            permissions=role.permissions if isinstance(role.permissions, list) else [],
            created_at=role.created_at
        )
        for role in roles
    ]


@roles_router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: UUID,
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Get role by ID."""
    role_service = RoleService(db)
    
    role = await role_service.get_by_id(role_id)
    
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=role.permissions if isinstance(role.permissions, list) else [],
        created_at=role.created_at
    )


# ===========================================
# Organizations Router
# ===========================================

organizations_router = APIRouter()


@organizations_router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate,
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization; current user becomes the owner."""
    user_service = UserService(db)
    org_service = OrganizationService(db)
    
    user = await user_service.get_by_id(UUID(token.sub))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    org = await org_service.create(user, data)
    
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        logo_url=org.logo_url,
        website=org.website,
        industry=org.industry,
        team_size=org.team_size,
        plan_type=org.plan_type,
        is_active=org.is_active,
        created_at=org.created_at,
        members_count=1,
    )


@organizations_router.get("", response_model=list[OrganizationResponse])
async def list_my_organizations(
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """List organizations where the current user is a member."""
    org_service = OrganizationService(db)
    orgs = await org_service.list_for_user(UUID(token.sub))
    
    items: list[OrganizationResponse] = []
    for org in orgs:
        members_count_result = await db.execute(
            text("SELECT COUNT(*) FROM organization_members WHERE organization_id = :org_id"),
            {"org_id": org.id},
        )
        count_value = int(members_count_result.scalar_one() or 0)
        items.append(
            OrganizationResponse(
                id=org.id,
                name=org.name,
                slug=org.slug,
                logo_url=org.logo_url,
                website=org.website,
                industry=org.industry,
                team_size=org.team_size,
                plan_type=org.plan_type,
                is_active=org.is_active,
                created_at=org.created_at,
                members_count=count_value,
            )
        )
    return items


async def require_org_role(
    org_id: UUID,
    token: TokenPayload,
    db: AsyncSession,
    allowed_roles: list[str] | None = None,
) -> None:
    """
    Ensure the caller has one of the allowed organization roles.
    
    Global platform admins (JWT role \"admin\") are always allowed.
    """
    if "admin" in token.roles:
        return
    
    if allowed_roles is None:
        allowed_roles = ["owner", "admin", "member"]
    
    result = await db.execute(
        text(
            "SELECT role FROM organization_members "
            "WHERE organization_id = :org_id AND user_id = :user_id"
        ),
        {"org_id": org_id, "user_id": UUID(token.sub)},
    )
    role = result.scalar_one_or_none()
    if role is None or role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient organization permissions",
        )


async def _ensure_org_member_or_admin(
    org_id: UUID,
    token: TokenPayload,
    db: AsyncSession,
) -> None:
    """Backward-compatible helper: require the caller to be at least a member."""
    await require_org_role(org_id, token, db, allowed_roles=["owner", "admin", "member"])


@organizations_router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: UUID,
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Get a single organization (must be member or admin)."""
    await _ensure_org_member_or_admin(org_id, token, db)
    
    org_service = OrganizationService(db)
    org = await org_service.get_by_id(org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    
    members_count_result = await db.execute(
        text("SELECT COUNT(*) FROM organization_members WHERE organization_id = :org_id"),
        {"org_id": org.id},
    )
    count_value = int(members_count_result.scalar_one() or 0)
    
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        logo_url=org.logo_url,
        website=org.website,
        industry=org.industry,
        team_size=org.team_size,
        plan_type=org.plan_type,
        is_active=org.is_active,
        created_at=org.created_at,
        members_count=count_value,
    )


@organizations_router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    data: OrganizationUpdate,
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Update organization (owner or admin only)."""
    await require_org_role(org_id, token, db, allowed_roles=["owner", "admin"])

    org_service = OrganizationService(db)
    org = await org_service.get_by_id(org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org = await org_service.update(org, data)

    members_count_result = await db.execute(
        text("SELECT COUNT(*) FROM organization_members WHERE organization_id = :org_id"),
        {"org_id": org.id},
    )
    count_value = int(members_count_result.scalar_one() or 0)

    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        logo_url=org.logo_url,
        website=org.website,
        industry=org.industry,
        team_size=org.team_size,
        plan_type=org.plan_type,
        is_active=org.is_active,
        created_at=org.created_at,
        members_count=count_value,
    )


@organizations_router.get("/{org_id}/members", response_model=list[OrganizationMemberResponse])
async def list_organization_members(
    org_id: UUID,
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """List members of an organization."""
    await _ensure_org_member_or_admin(org_id, token, db)
    
    org_service = OrganizationService(db)
    members = await org_service.list_members(org_id)
    
    return [
        OrganizationMemberResponse(
            user_id=m.user_id,
            email=m.user.email,
            role=m.role,
            joined_at=m.joined_at,
        )
        for m in members
    ]


@organizations_router.post("/{org_id}/invite", response_model=InvitationResponse)
async def invite_member_to_organization(
    org_id: UUID,
    data: InvitationCreate,
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Create an invitation for a user to join an organization."""
    # Only org owners and admins (or platform admins) can invite new members
    await require_org_role(org_id, token, db, allowed_roles=["owner", "admin"])
    
    org_service = OrganizationService(db)
    invitation_service = InvitationService(db)
    
    org = await org_service.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    
    role = data.role or "member"
    if role not in {"admin", "member"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin' or 'member'",
        )
    
    invitation = await invitation_service.create_invitation(
        organization=org,
        email=data.email,
        role=role,
    )
    
    # TODO: plug in real email delivery; for now this is handled out-of-band.
    
    return InvitationResponse(
        id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
    )


@organizations_router.delete("/{org_id}/members/{user_id}")
async def remove_member_from_organization(
    org_id: UUID,
    user_id: UUID,
    token: TokenPayload = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    """Remove a member from an organization."""
    # Only org owners and admins (or platform admins) can remove members
    await require_org_role(org_id, token, db, allowed_roles=["owner", "admin"])
    
    org_service = OrganizationService(db)
    success = await org_service.remove_member(org_id, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    
    return {"detail": "Member removed"}


# ===========================================
# Admin Router
# ===========================================

admin_router = APIRouter()


@admin_router.get("/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide overview stats (admin only)."""
    admin_service = AdminService(db)
    return await admin_service.get_overview()


@admin_router.get("/users", response_model=AdminUserListResponse)
async def admin_list_users(
    page: int = 1,
    page_size: int = 20,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """List users with aggregate stats (admin only)."""
    admin_service = AdminService(db)
    items, total = await admin_service.list_users(page=page, page_size=page_size)
    return AdminUserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@admin_router.get("/organizations", response_model=AdminOrganizationListResponse)
async def admin_list_organizations(
    page: int = 1,
    page_size: int = 20,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """List organizations with aggregate stats (admin only)."""
    admin_service = AdminService(db)
    items, total = await admin_service.list_organizations(page=page, page_size=page_size)
    return AdminOrganizationListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@admin_router.get("/audit-logs", response_model=AdminAuditLogListResponse)
async def admin_audit_logs(
    page: int = 1,
    page_size: int = 50,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """List admin audit log entries."""
    admin_service = AdminService(db)
    items, total = await admin_service.list_audit_logs(page=page, page_size=page_size)
    return AdminAuditLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@admin_router.post("/organizations/{org_id}/suspend")
async def admin_suspend_organization(
    org_id: UUID,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Suspend an organization (admin only)."""
    org_service = OrganizationService(db)
    org = await org_service.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    org.status = "suspended"
    org.is_active = False
    await db.flush()
    await _log_admin_action(
        db,
        admin_user_id=UUID(token.sub),
        organization_id=org_id,
        action="admin.suspend_organization",
        details={"previous_status": org.status},
    )
    return {"detail": "Organization suspended"}


@admin_router.post("/organizations/{org_id}/activate")
async def admin_activate_organization(
    org_id: UUID,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Activate a suspended organization (admin only)."""
    org_service = OrganizationService(db)
    org = await org_service.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    org.status = "active"
    org.is_active = True
    await db.flush()
    await _log_admin_action(
        db,
        admin_user_id=UUID(token.sub),
        organization_id=org_id,
        action="admin.activate_organization",
        details={},
    )
    return {"detail": "Organization activated"}


@admin_router.delete("/organizations/{org_id}")
async def admin_delete_organization(
    org_id: UUID,
    token: TokenPayload = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete an organization (admin only).
    
    Data is retained, but the organization is marked deleted and deactivated.
    """
    org_service = OrganizationService(db)
    org = await org_service.get_by_id(org_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    org.status = "deleted"
    org.is_active = False
    await db.flush()
    await _log_admin_action(
        db,
        admin_user_id=UUID(token.sub),
        organization_id=org_id,
        action="admin.delete_organization",
        details={"reason": "soft_delete"},
    )
    return {"detail": "Organization deleted"}


async def _log_admin_action(
    db: AsyncSession,
    admin_user_id: UUID,
    action: str,
    organization_id: UUID | None = None,
    details: dict | None = None,
) -> None:
    """Write an entry to the admin audit log table."""
    payload = json.dumps(details or {})
    await db.execute(
        text(
            "INSERT INTO admin_audit_logs (admin_user_id, organization_id, action, details) "
            "VALUES (:admin_user_id, :organization_id, :action, :details)"
        ),
        {
            "admin_user_id": admin_user_id,
            "organization_id": organization_id,
            "action": action,
            "details": payload,
        },
    )
    await db.flush()
