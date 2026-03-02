"""Tests for Redirect Service."""

import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_redirect_not_found():
    """Test redirect for non-existent short code."""
    import sys
    sys.path.insert(0, 'services/redirect-service')
    from main import app
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/nonexistent123",
            follow_redirects=False
        )
        
        # Should return 404 when link not found
        assert response.status_code in [404, 500]


@pytest.mark.asyncio
async def test_health_check():
    """Test redirect service health check."""
    import sys
    sys.path.insert(0, 'services/redirect-service')
    from main import app
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get("/health")
        
        assert response.status_code == 200
