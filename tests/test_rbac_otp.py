"""Tests for RBAC OTP helpers."""

import pytest


class FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}

    async def setex(self, key: str, ttl: int, value: str) -> None:
        # TTL is ignored for tests; we just store the value
        self.store[key] = value

    async def get(self, key: str):
        return self.store.get(key)

    async def set(self, key: str, value: str) -> None:
        self.store[key] = value

    async def delete(self, key: str) -> None:
        self.store.pop(key, None)


def _load_otp_module():
    """Load otp_service from rbac-service with an isolated sys.path."""
    import sys

    for k in list(sys.modules):
        if k in ("schemas", "auth", "config", "otp_service") or k.startswith("qr_"):
            del sys.modules[k]

    for p in ["services/rbac-service", "services\\rbac-service"]:
        while p in sys.path:
            sys.path.remove(p)
    sys.path.insert(0, "services/rbac-service")

    import otp_service  # type: ignore

    return otp_service


@pytest.mark.asyncio
async def test_generate_and_verify_otp_success():
    otp_module = _load_otp_module()
    otp_module.redis_client = FakeRedis()

    email = "user@example.com"
    code = await otp_module.generate_otp(email, "login", ttl_seconds=600)

    assert isinstance(code, str)
    assert len(code) == 6

    ok, error = await otp_module.verify_otp(email, "login", code, max_attempts=3)
    assert ok is True
    assert error == ""

    # Code should be consumed after successful verification
    ok2, _ = await otp_module.verify_otp(email, "login", code, max_attempts=3)
    assert ok2 is False


@pytest.mark.asyncio
async def test_verify_otp_invalid_and_too_many_attempts():
    otp_module = _load_otp_module()
    otp_module.redis_client = FakeRedis()

    email = "user2@example.com"
    _ = await otp_module.generate_otp(email, "signup", ttl_seconds=600)

    # Wrong code increments attempts
    ok1, msg1 = await otp_module.verify_otp(email, "signup", "000000", max_attempts=2)
    assert ok1 is False
    assert "Invalid code" in msg1

    # Exceed max_attempts
    ok2, msg2 = await otp_module.verify_otp(email, "signup", "000000", max_attempts=2)
    assert ok2 is False
    assert "Too many invalid attempts" in msg2

