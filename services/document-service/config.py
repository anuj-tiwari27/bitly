from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://bitly:bitly_secret@postgres:5432/bitly"
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"

    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket: str = "bitly-qr-images"
    aws_region: str = "us-east-1"

    base_url: str = "http://localhost:3000"
    short_domain: str = "http://localhost:8005"
    
    def get_app_base_url(self) -> str:
        """App base URL for document links. Prefer base_url; derive from short_domain when using tunnel."""
        base = (self.base_url or "").rstrip("/")
        short_base = (self.short_domain or "").replace("/r", "").rstrip("/")
        # When using tunnel (short_domain has non-localhost), use it so document URL matches
        if short_base and "localhost" not in short_base:
            return short_base
        return base or "http://localhost:3000"

    environment: str = "development"
    debug: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
