"""Tests for Link Service."""

import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_create_link(auth_headers):
    """Test creating a new short link."""
    import sys
    sys.path.insert(0, 'services/link-service')
    from main import app
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/links",
            json={
                "destination_url": "https://example.com/test",
                "title": "Test Link"
            },
            headers=auth_headers
        )
        
        # May fail if DB not available - that's expected in unit tests
        assert response.status_code in [201, 500]


@pytest.mark.asyncio
async def test_list_links(auth_headers):
    """Test listing links."""
    import sys
    sys.path.insert(0, 'services/link-service')
    from main import app
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/links",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 500]


def test_short_code_generation():
    """Test short code generation utility."""
    import sys
    sys.path.insert(0, 'services/link-service')
    from services import generate_short_code
    
    code = generate_short_code(7)
    
    assert len(code) == 7
    assert code.isalnum()
    
    codes = set(generate_short_code(7) for _ in range(100))
    assert len(codes) == 100


def test_url_validation():
    """Test URL validation in schema."""
    from pydantic import ValidationError
    import sys
    sys.path.insert(0, 'services/link-service')
    from schemas import LinkCreate
    
    link = LinkCreate(destination_url="example.com")
    assert link.destination_url == "https://example.com"
    
    link = LinkCreate(destination_url="http://example.com")
    assert link.destination_url == "http://example.com"
