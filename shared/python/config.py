"""Configuration management for all services."""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Base settings for all services."""
    
    # Database
    database_url: str = "postgresql+asyncpg://bitly:bitly_secret@localhost:5432/bitly"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    
    # ClickHouse
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 9000
    clickhouse_user: str = "bitly"
    clickhouse_password: str = "bitly_secret"
    clickhouse_db: str = "analytics"
    
    # JWT
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 30
    jwt_refresh_expiry_days: int = 7
    
    # OAuth
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    
    # AWS S3
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket: str = "bitly-qr-images"
    aws_region: str = "us-east-1"
    
    # Application
    short_domain: str = "http://localhost/r"
    environment: str = "development"
    debug: bool = True
    
    # Service URLs (for inter-service communication)
    event_collector_url: str = "http://event-collector:8000"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
