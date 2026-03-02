"""Redirect Service - High-performance URL redirector."""

import sys
sys.path.insert(0, '/app')

import asyncio
import hashlib
import json
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional
from urllib.parse import urlparse, parse_qs

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import RedirectResponse, HTMLResponse
import redis.asyncio as redis
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import httpx

from config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

redis_client: Optional[redis.Redis] = None
http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client, http_client
    
    redis_client = redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )
    http_client = httpx.AsyncClient(timeout=5.0)
    
    logger.info("Redirect service started")
    
    yield
    
    if redis_client:
        await redis_client.close()
    if http_client:
        await http_client.aclose()
    await engine.dispose()
    
    logger.info("Redirect service stopped")


app = FastAPI(
    title="Bitly Redirect Service",
    description="High-performance URL redirect service",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)


def get_cache_key(short_code: str) -> str:
    return f"link:code:{short_code}"


async def get_link_from_cache(short_code: str) -> Optional[dict]:
    """Get link data from Redis cache."""
    try:
        data = await redis_client.get(get_cache_key(short_code))
        if data:
            return json.loads(data)
    except Exception as e:
        logger.error(f"Redis error: {e}")
    return None


async def set_link_in_cache(short_code: str, link_data: dict) -> None:
    """Store link data in Redis cache."""
    try:
        await redis_client.set(
            get_cache_key(short_code),
            json.dumps(link_data),
            ex=settings.cache_ttl
        )
    except Exception as e:
        logger.error(f"Redis error: {e}")


async def get_link_from_db(short_code: str) -> Optional[dict]:
    """Get link data from database."""
    async with async_session_maker() as session:
        result = await session.execute(
            text("""
                SELECT 
                    l.id, l.destination_url, l.is_active, l.expires_at, 
                    l.password_hash, l.max_clicks, l.click_count,
                    l.campaign_id, l.user_id
                FROM links l
                WHERE l.short_code = :short_code
            """),
            {"short_code": short_code}
        )
        row = result.fetchone()
        
        if row:
            return {
                "id": str(row[0]),
                "destination_url": row[1],
                "is_active": row[2],
                "expires_at": row[3].isoformat() if row[3] else None,
                "has_password": row[4] is not None,
                "max_clicks": row[5],
                "click_count": row[6],
                "campaign_id": str(row[7]) if row[7] else None,
                "user_id": str(row[8]) if row[8] else None,
            }
    return None


async def increment_click_count(link_id: str) -> None:
    """Increment click count in database."""
    try:
        async with async_session_maker() as session:
            await session.execute(
                text("UPDATE links SET click_count = click_count + 1 WHERE id = :id"),
                {"id": link_id}
            )
            await session.commit()
    except Exception as e:
        logger.error(f"Failed to increment click count: {e}")


def hash_ip(ip: str) -> str:
    """Hash IP address for privacy."""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def extract_utm_params(url: str) -> dict:
    """Extract UTM parameters from URL."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    
    return {
        "utm_source": params.get("utm_source", [None])[0],
        "utm_medium": params.get("utm_medium", [None])[0],
        "utm_campaign": params.get("utm_campaign", [None])[0],
        "utm_term": params.get("utm_term", [None])[0],
        "utm_content": params.get("utm_content", [None])[0],
    }


async def emit_click_event(
    link_data: dict,
    short_code: str,
    request: Request
) -> None:
    """Emit click event to event collector (fire and forget)."""
    try:
        client_ip = request.headers.get("X-Forwarded-For", request.client.host)
        if "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()
        
        referrer = request.headers.get("Referer")
        utm_params = extract_utm_params(str(request.url))
        
        event = {
            "link_id": link_data["id"],
            "campaign_id": link_data.get("campaign_id"),
            "store_id": None,
            "user_id": link_data.get("user_id"),
            "short_code": short_code,
            "destination_url": link_data["destination_url"],
            "timestamp": datetime.utcnow().isoformat(),
            "ip_hash": hash_ip(client_ip),
            "user_agent": request.headers.get("User-Agent", ""),
            "referrer": referrer,
            **utm_params
        }
        
        asyncio.create_task(send_event_to_collector(event))
        
    except Exception as e:
        logger.error(f"Failed to emit click event: {e}")


async def send_event_to_collector(event: dict) -> None:
    """Send event to event collector service."""
    try:
        await http_client.post(
            f"{settings.event_collector_url}/api/events/click",
            json=event
        )
    except Exception as e:
        logger.error(f"Failed to send event to collector: {e}")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "redirect-service"}


@app.get("/r/{short_code}")
async def redirect(short_code: str, request: Request):
    """
    Main redirect endpoint.
    
    Flow:
    1. Check Redis cache for link data
    2. If miss, query database and cache result
    3. Validate link (active, not expired, click limit)
    4. Return 302 redirect
    5. Async: emit click event
    """
    link_data = await get_link_from_cache(short_code)
    
    if link_data is None:
        link_data = await get_link_from_db(short_code)
        
        if link_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Link not found"
            )
        
        await set_link_in_cache(short_code, link_data)
    
    if not link_data["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Link is no longer active"
        )
    
    if link_data["expires_at"]:
        expires = datetime.fromisoformat(link_data["expires_at"])
        if datetime.utcnow() > expires:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Link has expired"
            )
    
    if link_data["max_clicks"]:
        if link_data["click_count"] >= link_data["max_clicks"]:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Link click limit reached"
            )
    
    if link_data["has_password"]:
        return HTMLResponse(
            content=f"""
            <!DOCTYPE html>
            <html>
            <head><title>Password Required</title></head>
            <body>
                <h1>This link is password protected</h1>
                <p>Please enter the password to continue.</p>
                <form method="post" action="/r/{short_code}/verify">
                    <input type="password" name="password" required>
                    <button type="submit">Submit</button>
                </form>
            </body>
            </html>
            """,
            status_code=200
        )
    
    asyncio.create_task(increment_click_count(link_data["id"]))
    
    await emit_click_event(link_data, short_code, request)
    
    return RedirectResponse(
        url=link_data["destination_url"],
        status_code=status.HTTP_302_FOUND
    )


@app.post("/r/{short_code}/verify")
async def verify_password(short_code: str, request: Request):
    """Verify password for protected links."""
    from passlib.context import CryptContext
    
    form_data = await request.form()
    password = form_data.get("password", "")
    
    link_data = await get_link_from_cache(short_code)
    if link_data is None:
        link_data = await get_link_from_db(short_code)
    
    if link_data is None:
        raise HTTPException(status_code=404, detail="Link not found")
    
    async with async_session_maker() as session:
        result = await session.execute(
            text("SELECT password_hash FROM links WHERE short_code = :code"),
            {"code": short_code}
        )
        row = result.fetchone()
        
        if row and row[0]:
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            if pwd_context.verify(password, row[0]):
                asyncio.create_task(increment_click_count(link_data["id"]))
                await emit_click_event(link_data, short_code, request)
                
                return RedirectResponse(
                    url=link_data["destination_url"],
                    status_code=status.HTTP_302_FOUND
                )
    
    return HTMLResponse(
        content="""
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Password</title></head>
        <body>
            <h1>Invalid password</h1>
            <a href="javascript:history.back()">Try again</a>
        </body>
        </html>
        """,
        status_code=401
    )
