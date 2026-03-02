from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    kafka_bootstrap_servers: str = "kafka:29092"
    kafka_topic: str = "click-events"
    kafka_group_id: str = "analytics-processor-group"
    
    clickhouse_host: str = "clickhouse"
    clickhouse_port: int = 9000
    clickhouse_user: str = "bitly"
    clickhouse_password: str = "bitly_secret"
    clickhouse_db: str = "analytics"
    
    database_url: str = "postgresql+asyncpg://bitly:bitly_secret@postgres:5432/bitly"
    
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    
    batch_size: int = 100
    batch_timeout_ms: int = 5000
    
    environment: str = "development"
    debug: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
