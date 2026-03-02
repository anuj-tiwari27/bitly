"""Pytest configuration and fixtures."""

import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

TEST_DATABASE_URL = "postgresql+asyncpg://bitly:bitly_secret@localhost:5432/bitly_test"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_session():
    """Create a test database session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()
    
    await engine.dispose()


@pytest.fixture
def auth_headers():
    """Generate test authentication headers."""
    from jose import jwt
    from datetime import datetime, timedelta
    
    payload = {
        "sub": "test-user-id",
        "email": "test@example.com",
        "roles": ["marketing_user"],
        "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
        "iat": int(datetime.utcnow().timestamp()),
        "type": "access"
    }
    
    token = jwt.encode(payload, "your-super-secret-jwt-key-change-in-production", algorithm="HS256")
    
    return {"Authorization": f"Bearer {token}"}
