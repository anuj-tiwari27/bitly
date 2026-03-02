from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://bitly:bitly_secret@postgres:5432/bitly"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:29092"
    event_collector_url: str = "http://event-collector:8000"
    
    cache_ttl: int = 300  # 5 minutes
    
    environment: str = "development"
    debug: bool = False  # Keep false for performance
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
