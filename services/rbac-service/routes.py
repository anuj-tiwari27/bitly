"""API routes for RBAC service."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import (
    UserCreate, UserUpdate, UserResponse,
    LoginRequest, TokenResponse, TokenRefreshRequest,
    RoleResponse, RoleAssignment
)
from auth import get_current_user_token, require_roles, TokenPayload
from services import UserService, TokenService, RoleService
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
    
    # Check if user exists
    existing = await user_service.get_by_email(data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = await user_service.create(data)
    
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
