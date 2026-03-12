"""RBAC Service - Authentication and Authorization."""

import sys
sys.path.insert(0, '/app')

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from config import get_settings
from routes import auth_router, users_router, roles_router, organizations_router, admin_router
from database import init_db, close_db, async_session_maker
from models import User, Role

logger = logging.getLogger(__name__)


async def seed_admin_if_configured():
    """If SEED_ADMIN_EMAIL is set, ensure that user has the admin role."""
    settings = get_settings()
    if not settings.seed_admin_email or not settings.seed_admin_email.strip():
        return
    email = settings.seed_admin_email.strip().lower()
    async with async_session_maker() as session:
        try:
            role_result = await session.execute(select(Role).where(Role.name == "admin"))
            admin_role = role_result.scalar_one_or_none()
            if not admin_role:
                logger.warning("seed_admin: admin role not found in database")
                return
            user_result = await session.execute(
                select(User).options(selectinload(User.roles)).where(User.email == email)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                logger.info("seed_admin: user %s not found, skip", email)
                return
            if admin_role in user.roles:
                logger.info("seed_admin: user %s already has admin role", email)
                return
            user.roles.append(admin_role)
            await session.commit()
            logger.info("seed_admin: assigned admin role to %s", email)
        except Exception as e:
            logger.exception("seed_admin failed: %s", e)
            await session.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await init_db()
    await seed_admin_if_configured()
    yield
    await close_db()


settings = get_settings()

app = FastAPI(
    title="Bitly RBAC Service",
    description="Authentication and Authorization service for Bitly platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(roles_router, prefix="/api/roles", tags=["Roles"])
app.include_router(organizations_router, prefix="/api/organizations", tags=["Organizations"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "rbac-service"}
