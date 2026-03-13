"""OTP creation and verification helpers backed by Redis."""

import json
import secrets
from typing import Literal, Tuple

import redis.asyncio as redis

from config import get_settings

OtpPurpose = Literal["signup", "login"]

settings = get_settings()

redis_client: redis.Redis = redis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
)


def _otp_key(email: str, purpose: OtpPurpose) -> str:
    email_norm = email.strip().lower()
    return f"auth:otp:{purpose}:{email_norm}"


async def generate_otp(email: str, purpose: OtpPurpose, ttl_seconds: int = 600) -> str:
    """Generate a 6-digit OTP code, store it in Redis, and return it."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    payload = {"code": code, "attempts": 0}
    await redis_client.setex(_otp_key(email, purpose), ttl_seconds, json.dumps(payload))
    return code


async def verify_otp(email: str, purpose: OtpPurpose, code: str, max_attempts: int = 5) -> Tuple[bool, str]:
    """Verify an OTP code from Redis.

    Returns (is_valid, error_message_if_any).
    """
    key = _otp_key(email, purpose)
    raw = await redis_client.get(key)
    if not raw:
        return False, "Invalid or expired code"

    try:
        data = json.loads(raw)
    except Exception:
        await redis_client.delete(key)
        return False, "Invalid or expired code"

    stored_code = str(data.get("code", ""))
    attempts = int(data.get("attempts", 0))

    if attempts >= max_attempts:
        await redis_client.delete(key)
        return False, "Too many invalid attempts. Please request a new code."

    if stored_code != str(code).strip():
        data["attempts"] = attempts + 1
        await redis_client.set(key, json.dumps(data))
        return False, "Invalid code"

    # Successful verification – consume the code.
    await redis_client.delete(key)
    return True, ""

