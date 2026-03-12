"""Link Service configuration."""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    model_config = ConfigDict(extra="ignore", env_file=".env", case_sensitive=False)

    database_url: str = "postgresql+asyncpg://bitly:bitly_secret@postgres:5432/bitly"
    redis_url: str = "redis://redis:6379/0"
    
    clickhouse_host: str = "clickhouse"
    clickhouse_port: int = 9000
    clickhouse_user: str = "bitly"
    clickhouse_password: str = "bitly_secret"
    clickhouse_db: str = "analytics"
    
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    
    short_domain: str = "http://localhost/r"
    short_code_length: int = 7
    
    environment: str = "development"
    debug: bool = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
