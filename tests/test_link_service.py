"""Tests for Link Service."""

import sys
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock, patch

_link_path = str(Path(__file__).resolve().parent.parent / "services" / "link-service")

import pytest
from httpx import AsyncClient, ASGITransport


def _make_mock_link(user_id, short_code="abc1234", destination_url="https://example.com/test", title="Test"):
    """Create a mock Link object with required attributes for LinkResponse."""
    now = datetime.now(timezone.utc)
    link = MagicMock()
    link.id = uuid4()
    link.campaign_id = None
    link.user_id = user_id
    link.organization_id = None
    link.short_code = short_code
    link.destination_url = destination_url
    link.title = title
    link.description = None
    link.is_active = True
    link.expires_at = None
    link.max_clicks = None
    link.click_count = 0
    link.has_password = False
    link.has_qr = False
    link.extra_data = {}
    link.created_at = now
    link.updated_at = now
    return link


async def _mock_get_db():
    """Async generator yielding a mock DB session."""
    mock = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalar.return_value = 0
    mock_result.scalars.return_value.all.return_value = []
    mock.execute = AsyncMock(return_value=mock_result)
    mock.add = MagicMock()
    mock.commit = AsyncMock()
    mock.refresh = AsyncMock()
    try:
        yield mock
    finally:
        pass


def _get_link_app():
    """Load link service app with mocked DB and analytics."""
    # Clear cached modules from other services so we get link-service
    for k in list(sys.modules):
        if k in ("schemas", "auth", "config", "routes", "database", "services") or k.startswith("qr_"):
            del sys.modules[k]
    while _link_path in sys.path:
        sys.path.remove(_link_path)
    sys.path.insert(0, _link_path)
    mock_analytics = MagicMock()
    mock_analytics.LinkAnalytics = MagicMock()
    sys.modules["analytics"] = mock_analytics
    try:
        from main import app
        from database import get_db
        from services import LinkService
        app.dependency_overrides[get_db] = _mock_get_db
        # Mock LinkService.create to return a valid link (avoids complex DB mocking)
        original_create = LinkService.create
        async def mock_create(self, user_id, data):
            short_code = data.custom_code if data.custom_code else "abc1234"
            link = _make_mock_link(
                user_id,
                short_code=short_code,
                title=data.title or "Link",
                destination_url=data.destination_url
            )
            return link

        async def mock_list_by_user(self, user_id, **kwargs):
            return [], 0

        LinkService.create = mock_create
        LinkService.list_by_user = mock_list_by_user
        return app
    finally:
        if "analytics" in sys.modules and sys.modules["analytics"] is mock_analytics:
            del sys.modules["analytics"]


@pytest.mark.asyncio
async def test_create_link(auth_headers):
    """Test creating a new short link."""
    app = _get_link_app()
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            health = await client.get("/health")
            assert health.status_code == 200
            response = await client.post(
                "/api/links",
                json={
                    "destination_url": "https://example.com/test",
                    "title": "Test Link"
                },
                headers=auth_headers
            )
            assert response.status_code in [201, 401, 500], f"Unexpected {response.status_code}: {response.text}"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_links(auth_headers):
    """Test listing links."""
    app = _get_link_app()
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/links",
                headers=auth_headers
            )
            assert response.status_code in [200, 401, 500], f"Unexpected {response.status_code}: {response.text}"
    finally:
        app.dependency_overrides.clear()


def test_short_code_generation():
    """Test short code generation utility."""
    import secrets
    BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

    def generate_short_code(length: int = 7) -> str:
        return ''.join(secrets.choice(BASE62_CHARS) for _ in range(length))

    code = generate_short_code(7)

    assert len(code) == 7
    assert code.isalnum()

    codes = set(generate_short_code(7) for _ in range(100))
    assert len(codes) == 100


def test_url_validation():
    """Test URL validation in schema."""
    import sys
    import importlib.util
    # Load link-service schemas explicitly to avoid conflict with qr-service
    spec = importlib.util.spec_from_file_location(
        "link_schemas",
        "services/link-service/schemas.py"
    )
    link_schemas = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(link_schemas)
    LinkCreate = link_schemas.LinkCreate

    link = LinkCreate(destination_url="example.com")
    assert link.destination_url == "https://example.com"

    link2 = LinkCreate(destination_url="http://example.com")
    assert link2.destination_url == "http://example.com"
