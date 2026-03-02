from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    kafka_bootstrap_servers: str = "kafka:29092"
    kafka_topic: str = "click-events"
    
    environment: str = "development"
    debug: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
