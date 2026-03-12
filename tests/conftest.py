"""Pytest configuration and fixtures."""

import asyncio
import pytest

from httpx import AsyncClient, ASGITransport


def pytest_collection_modifyitems(items):
    """Run unit tests in order that avoids cross-service import conflicts."""
    order = {"test_auth": 0, "test_link_service": 1, "test_qr_generator": 2, "test_redirect": 3}
    def key(item):
        path = str(getattr(item, "path", getattr(item, "fspath", "")))
        for name, idx in order.items():
            if name in path:
                return (idx, item.nodeid)
        return (99, item.nodeid)
    items.sort(key=key)
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
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4

    user_id = str(uuid4())
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": "test@example.com",
        "roles": ["marketing_user"],
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "iat": int(now.timestamp()),
        "type": "access"
    }

    token = jwt.encode(payload, "your-super-secret-jwt-key-change-in-production", algorithm="HS256")

    return {"Authorization": f"Bearer {token}"}
