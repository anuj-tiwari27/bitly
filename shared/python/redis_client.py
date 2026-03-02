"""Redis client wrapper for caching."""

import json
from typing import Any, Optional
from datetime import timedelta

import redis.asyncio as redis
from redis.asyncio import Redis

from .config import get_settings


class RedisClient:
    """Async Redis client wrapper."""
    
    def __init__(self, redis_url: str | None = None):
        self.redis_url = redis_url or get_settings().redis_url
        self._client: Redis | None = None
    
    @property
    def client(self) -> Redis:
        if self._client is None:
            self._client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client
    
    async def ping(self) -> bool:
        """Check if Redis is available."""
        try:
            return await self.client.ping()
        except Exception:
            return False
    
    async def get(self, key: str) -> Optional[str]:
        """Get a value from Redis."""
        return await self.client.get(key)
    
    async def get_json(self, key: str) -> Optional[dict]:
        """Get a JSON value from Redis."""
        value = await self.get(key)
        if value is not None:
            return json.loads(value)
        return None
    
    async def set(
        self, 
        key: str, 
        value: str, 
        expire: int | timedelta | None = None
    ) -> bool:
        """Set a value in Redis."""
        if isinstance(expire, timedelta):
            expire = int(expire.total_seconds())
        return await self.client.set(key, value, ex=expire)
    
    async def set_json(
        self, 
        key: str, 
        value: Any, 
        expire: int | timedelta | None = None
    ) -> bool:
        """Set a JSON value in Redis."""
        return await self.set(key, json.dumps(value), expire)
    
    async def delete(self, *keys: str) -> int:
        """Delete keys from Redis."""
        if not keys:
            return 0
        return await self.client.delete(*keys)
    
    async def exists(self, key: str) -> bool:
        """Check if a key exists in Redis."""
        return await self.client.exists(key) > 0
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiry on a key."""
        return await self.client.expire(key, seconds)
    
    async def ttl(self, key: str) -> int:
        """Get time-to-live for a key."""
        return await self.client.ttl(key)
    
    async def incr(self, key: str) -> int:
        """Increment a counter."""
        return await self.client.incr(key)
    
    async def incrby(self, key: str, amount: int) -> int:
        """Increment a counter by a specific amount."""
        return await self.client.incrby(key, amount)
    
    async def close(self) -> None:
        """Close the Redis connection."""
        if self._client is not None:
            await self._client.close()
            self._client = None


# Global Redis client instance
_redis_client: RedisClient | None = None


def get_redis_client() -> RedisClient:
    """Get or create the global Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient()
    return _redis_client


async def get_redis() -> RedisClient:
    """FastAPI dependency for Redis client."""
    return get_redis_client()


async def close_redis() -> None:
    """Close Redis connections."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None


# ===========================================
# Cache Keys
# ===========================================

class CacheKeys:
    """Cache key patterns."""
    
    # Link caching (for redirect service)
    LINK_BY_CODE = "link:code:{short_code}"
    LINK_BY_ID = "link:id:{link_id}"
    
    # User session
    USER_SESSION = "user:session:{user_id}"
    
    # Rate limiting
    RATE_LIMIT = "ratelimit:{key}:{window}"
    
    # Analytics cache
    ANALYTICS_OVERVIEW = "analytics:overview:{user_id}"
    ANALYTICS_LINK = "analytics:link:{link_id}"
    
    # QR code cache
    QR_PRESIGNED_URL = "qr:url:{qr_id}"
    
    @classmethod
    def link_by_code(cls, short_code: str) -> str:
        return cls.LINK_BY_CODE.format(short_code=short_code)
    
    @classmethod
    def link_by_id(cls, link_id: str) -> str:
        return cls.LINK_BY_ID.format(link_id=link_id)
    
    @classmethod
    def user_session(cls, user_id: str) -> str:
        return cls.USER_SESSION.format(user_id=user_id)
    
    @classmethod
    def rate_limit(cls, key: str, window: str) -> str:
        return cls.RATE_LIMIT.format(key=key, window=window)
    
    @classmethod
    def analytics_overview(cls, user_id: str) -> str:
        return cls.ANALYTICS_OVERVIEW.format(user_id=user_id)
    
    @classmethod
    def analytics_link(cls, link_id: str) -> str:
        return cls.ANALYTICS_LINK.format(link_id=link_id)
    
    @classmethod
    def qr_presigned_url(cls, qr_id: str) -> str:
        return cls.QR_PRESIGNED_URL.format(qr_id=qr_id)


# ===========================================
# Cache TTLs
# ===========================================

class CacheTTL:
    """Cache time-to-live values in seconds."""
    
    LINK_CACHE = 300  # 5 minutes
    USER_SESSION = 1800  # 30 minutes
    ANALYTICS_CACHE = 60  # 1 minute
    QR_PRESIGNED_URL = 3600  # 1 hour
    RATE_LIMIT_WINDOW = 60  # 1 minute
