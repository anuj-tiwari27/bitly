"""Tests for Redirect Service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def mock_redis():
    """Mock Redis client for redirect tests."""
    mock = MagicMock()
    mock.incr = AsyncMock(return_value=1)
    mock.expire = AsyncMock(return_value=True)
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    return mock


@pytest.fixture
def redirect_app(mock_redis):
    """Create redirect app with mocked external dependencies."""
    import sys
    # Clear cached main from other services (e.g. link-service)
    for k in list(sys.modules):
        if k == "main":
            del sys.modules[k]
            break
    sys.path.insert(0, 'services/redirect-service')

    pytest.importorskip('redis')
    with patch.dict('os.environ', {
        'REDIS_URL': 'redis://localhost:6379/0',
        'DATABASE_URL': 'postgresql+asyncpg://bitly:bitly_secret@localhost:5432/bitly',
    }):
        with patch('redis.asyncio.from_url', return_value=mock_redis):
            import main as redirect_main
            with patch.object(redirect_main, 'get_link_from_cache', AsyncMock(return_value=None)):
                with patch.object(redirect_main, 'get_link_from_db', AsyncMock(return_value=None)):
                    yield redirect_main.app


@pytest.mark.asyncio
async def test_redirect_not_found(redirect_app):
    """Test redirect for non-existent short code."""
    async with AsyncClient(
        transport=ASGITransport(app=redirect_app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/r/nonexistent123",
            follow_redirects=False
        )

        # Should return 404 when link not found
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_health_check(redirect_app):
    """Test redirect service health check."""
    async with AsyncClient(
        transport=ASGITransport(app=redirect_app),
        base_url="http://test"
    ) as client:
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert "redirect" in data.get("service", "").lower()
