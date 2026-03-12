from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://bitly:bitly_secret@postgres:5432/bitly"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:29092"
    event_collector_url: str = "http://event-collector:8000"
    
    cache_ttl: int = 300  # 5 minutes
    
    # Simple rate limiting for redirects
    rate_limit_window_seconds: int = 60
    rate_limit_max_requests: int = 120
    
    environment: str = "development"
    debug: bool = False  # Keep false for performance

    model_config = ConfigDict(extra="ignore", env_file=".env", case_sensitive=False)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
