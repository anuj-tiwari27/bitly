"""RBAC Service configuration."""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Settings for RBAC service."""
    model_config = ConfigDict(extra="ignore", env_file=".env", case_sensitive=False)

    # Database
    database_url: str = "postgresql+asyncpg://bitly:bitly_secret@postgres:5432/bitly"
    
    # Redis
    redis_url: str = "redis://redis:6379/0"
    
    # JWT
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 30
    jwt_refresh_expiry_days: int = 7
    
    # OAuth
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: str = "http://localhost/api/auth/oauth/google/callback"
    
    # App
    environment: str = "development"
    debug: bool = True
    seed_admin_email: Optional[str] = None  # If set, assign admin role to this user on startup

    # Frontend
    frontend_base_url: str = "http://localhost:3000"

    # SMTP / Email (SendPulse or other SMTP provider)
    smtp_host: str = "smtp-pulse.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: str = "The Little URL"
    smtp_use_tls: bool = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
