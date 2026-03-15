"""Analytics Processor - Consumes events from Kafka and stores in ClickHouse."""

import sys
sys.path.insert(0, '/app')

import asyncio
import json
import logging
import signal
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError
from clickhouse_driver import Client
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import get_settings
from enrichment import enrich_event

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

shutdown_event = asyncio.Event()


def get_clickhouse_client() -> Client:
    return Client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        user=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database=settings.clickhouse_db
    )


def insert_events_to_clickhouse(events: List[Dict[str, Any]]) -> int:
    """Insert a batch of events into ClickHouse."""
    if not events:
        return 0
    
    client = get_clickhouse_client()
    
    rows = []
    for event in events:
        timestamp = event.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        
        row = (
            uuid4(),  # event_id
            UUID(event.get("link_id")) if event.get("link_id") else None,
            UUID(event.get("campaign_id")) if event.get("campaign_id") else None,
            UUID(event.get("store_id")) if event.get("store_id") else None,
            UUID(event.get("user_id")) if event.get("user_id") else None,
            UUID(event.get("organization_id")) if event.get("organization_id") else None,
            event.get("short_code", ""),
            event.get("destination_url", ""),
            timestamp,
            timestamp.date() if timestamp else datetime.utcnow().date(),
            event.get("ip_hash", ""),
            event.get("user_agent", ""),
            event.get("referrer"),
            event.get("country_code"),
            event.get("country_name"),
            event.get("region"),
            event.get("city"),
            event.get("latitude"),
            event.get("longitude"),
            event.get("device_type"),
            event.get("device_brand"),
            event.get("device_model"),
            event.get("os_name"),
            event.get("os_version"),
            event.get("browser_name"),
            event.get("browser_version"),
            event.get("is_bot", 0),
            event.get("utm_source"),
            event.get("utm_medium"),
            event.get("utm_campaign"),
            event.get("utm_term"),
            event.get("utm_content"),
        )
        rows.append(row)
    
    try:
        client.execute(
            """
            INSERT INTO click_events (
                event_id, link_id, campaign_id, store_id, user_id, organization_id,
                short_code, destination_url, timestamp, date,
                ip_hash, user_agent, referrer,
                country_code, country_name, region, city, latitude, longitude,
                device_type, device_brand, device_model,
                os_name, os_version, browser_name, browser_version, is_bot,
                utm_source, utm_medium, utm_campaign, utm_term, utm_content
            ) VALUES
            """,
            rows
        )
        return len(rows)
    except Exception as e:
        logger.error(f"ClickHouse insert error: {e}")
        return 0


async def consume_events():
    """Main Kafka consumer loop."""
    consumer = AIOKafkaConsumer(
        settings.kafka_topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=settings.kafka_group_id,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        auto_commit_interval_ms=1000,
    )
    
    await consumer.start()
    logger.info(f"Kafka consumer started, listening to {settings.kafka_topic}")
    
    batch: List[Dict[str, Any]] = []
    last_flush = datetime.utcnow()
    
    try:
        while not shutdown_event.is_set():
            try:
                messages = await asyncio.wait_for(
                    consumer.getmany(
                        timeout_ms=settings.batch_timeout_ms,
                        max_records=settings.batch_size
                    ),
                    timeout=10.0
                )
                
                for tp, msgs in messages.items():
                    for msg in msgs:
                        enriched = enrich_event(msg.value)
                        batch.append(enriched)
                
                now = datetime.utcnow()
                time_since_flush = (now - last_flush).total_seconds() * 1000
                
                if len(batch) >= settings.batch_size or time_since_flush >= settings.batch_timeout_ms:
                    if batch:
                        inserted = insert_events_to_clickhouse(batch)
                        logger.info(f"Inserted {inserted} events to ClickHouse")
                        batch = []
                        last_flush = now
                
            except asyncio.TimeoutError:
                if batch:
                    inserted = insert_events_to_clickhouse(batch)
                    logger.info(f"Timeout flush: inserted {inserted} events")
                    batch = []
                    last_flush = datetime.utcnow()
            except KafkaError as e:
                logger.error(f"Kafka error: {e}")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Consumer error: {e}")
                await asyncio.sleep(1)
    
    finally:
        if batch:
            insert_events_to_clickhouse(batch)
        await consumer.stop()
        logger.info("Kafka consumer stopped")


# ===========================================
# FastAPI for analytics queries
# ===========================================

app = FastAPI(
    title="Bitly Analytics Processor",
    description="Analytics processing and query service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth dependency (simplified)
from jose import jwt, JWTError
from fastapi import status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

security = HTTPBearer()

class TokenPayload(BaseModel):
    sub: str
    email: str
    roles: list
    exp: int
    iat: int

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenPayload:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        return TokenPayload(**payload)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    """Require admin role for platform-wide analytics."""
    if not user.roles or "admin" not in user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


from fastapi import Query

def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse date string to datetime."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        return None


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analytics-processor"}


@app.get("/api/analytics/overview")
async def get_overview(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    user: TokenPayload = Depends(get_current_user)
):
    """Get analytics overview for the current user (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        # Current period stats (filtered by user_id)
        total_clicks = client.execute(
            "SELECT count() FROM click_events WHERE user_id = %(user_id)s",
            {"user_id": user_id}
        )[0][0]
        
        unique_visitors = client.execute(
            "SELECT uniqExact(ip_hash) FROM click_events WHERE user_id = %(user_id)s",
            {"user_id": user_id}
        )[0][0]
        
        clicks_today = client.execute(
            "SELECT count() FROM click_events WHERE user_id = %(user_id)s AND date = today()",
            {"user_id": user_id}
        )[0][0]
        
        clicks_this_week = client.execute(
            "SELECT count() FROM click_events WHERE user_id = %(user_id)s AND date >= today() - 7",
            {"user_id": user_id}
        )[0][0]
        
        clicks_this_month = client.execute(
            "SELECT count() FROM click_events WHERE user_id = %(user_id)s AND date >= today() - 30",
            {"user_id": user_id}
        )[0][0]
        
        # Previous period for growth calculation
        clicks_last_week = client.execute(
            """SELECT count() FROM click_events 
               WHERE user_id = %(user_id)s AND date >= today() - 14 AND date < today() - 7""",
            {"user_id": user_id}
        )[0][0]
        
        clicks_prev_month = client.execute(
            """SELECT count() FROM click_events 
               WHERE user_id = %(user_id)s AND date >= today() - 60 AND date < today() - 30""",
            {"user_id": user_id}
        )[0][0]
        
        # Unique visitors in comparable periods for growth (week-over-week)
        unique_visitors_this_week = client.execute(
            """SELECT uniqExact(ip_hash) FROM click_events 
               WHERE user_id = %(user_id)s AND date >= today() - 7""",
            {"user_id": user_id}
        )[0][0]
        unique_visitors_last_week = client.execute(
            """SELECT uniqExact(ip_hash) FROM click_events 
               WHERE user_id = %(user_id)s AND date >= today() - 14 AND date < today() - 7""",
            {"user_id": user_id}
        )[0][0]
        
        clicks_yesterday = client.execute(
            "SELECT count() FROM click_events WHERE user_id = %(user_id)s AND date = today() - 1",
            {"user_id": user_id}
        )[0][0]
        
        # Calculate growth percentages
        def calc_growth(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round(((current - previous) / previous) * 100, 1)
        
        clicks_growth = calc_growth(clicks_this_week, clicks_last_week)
        visitors_growth = calc_growth(unique_visitors_this_week, unique_visitors_last_week)
        today_growth = calc_growth(clicks_today, clicks_yesterday)
        
        return {
            "total_clicks": total_clicks,
            "unique_visitors": unique_visitors,
            "clicks_today": clicks_today,
            "clicks_this_week": clicks_this_week,
            "clicks_this_month": clicks_this_month,
            "clicks_growth": clicks_growth,
            "visitors_growth": visitors_growth,
            "today_growth": today_growth
        }
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return {
            "total_clicks": 0,
            "unique_visitors": 0,
            "clicks_today": 0,
            "clicks_this_week": 0,
            "clicks_this_month": 0,
            "clicks_growth": 0,
            "visitors_growth": 0,
            "today_growth": 0
        }


@app.get("/api/analytics/clicks-over-time")
async def get_clicks_over_time(
    days: int = 30,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: TokenPayload = Depends(get_current_user)
):
    """Get click data over time (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    start = parse_date(start_date)
    end = parse_date(end_date)
    
    try:
        if start and end:
            result = client.execute(
                """
                SELECT date, count() as clicks, uniqExact(ip_hash) as unique_visitors
                FROM click_events
                WHERE user_id = %(user_id)s AND date >= %(start)s AND date <= %(end)s
                GROUP BY date
                ORDER BY date
                """,
                {"user_id": user_id, "start": start.date(), "end": end.date()}
            )
        else:
            result = client.execute(
                """
                SELECT date, count() as clicks, uniqExact(ip_hash) as unique_visitors
                FROM click_events
                WHERE user_id = %(user_id)s AND date >= today() - %(days)s
                GROUP BY date
                ORDER BY date
                """,
                {"user_id": user_id, "days": days}
            )
        
        return [
            {"date": str(row[0]), "clicks": row[1], "unique_visitors": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/top-links")
async def get_top_links(
    limit: int = 10,
    days: int = 30,
    user: TokenPayload = Depends(get_current_user)
):
    """Get top performing links (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                link_id, 
                short_code,
                any(destination_url) as destination_url,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY link_id, short_code
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"user_id": user_id, "limit": limit, "days": days}
        )
        
        return [
            {
                "link_id": str(row[0]) if row[0] else None,
                "short_code": row[1],
                "destination_url": row[2],
                "clicks": row[3],
                "unique_visitors": row[4]
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/devices")
async def get_device_breakdown(
    days: int = 30,
    user: TokenPayload = Depends(get_current_user)
):
    """Get device type breakdown (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                ifNull(device_type, 'unknown') as device,
                count() as clicks,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY device
            ORDER BY clicks DESC
            """,
            {"user_id": user_id, "days": days}
        )
        
        return [
            {"device_type": row[0], "clicks": row[1], "percentage": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/browsers")
async def get_browser_breakdown(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(get_current_user)
):
    """Get browser breakdown (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                ifNull(browser_name, 'unknown') as browser,
                count() as clicks,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY browser
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"user_id": user_id, "days": days, "limit": limit}
        )
        
        return [
            {"browser": row[0], "clicks": row[1], "percentage": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/operating-systems")
async def get_os_breakdown(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(get_current_user)
):
    """Get operating system breakdown (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                ifNull(os_name, 'unknown') as os,
                count() as clicks,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY os
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"user_id": user_id, "days": days, "limit": limit}
        )
        
        return [
            {"os": row[0], "clicks": row[1], "percentage": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/referrers")
async def get_referrer_breakdown(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(get_current_user)
):
    """Get referrer breakdown (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                if(referrer = '' OR referrer IS NULL, 'Direct', domain(referrer)) as referrer_domain,
                count() as clicks,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY referrer_domain
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"user_id": user_id, "days": days, "limit": limit}
        )
        
        return [
            {"referrer": row[0] or "Direct", "clicks": row[1], "percentage": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/countries")
async def get_country_breakdown(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(get_current_user)
):
    """Get country breakdown (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                ifNull(country_code, 'unknown') as country_code,
                ifNull(country_name, 'Unknown') as country_name,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY country_code, country_name
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"user_id": user_id, "days": days, "limit": limit}
        )
        
        return [
            {
                "country_code": row[0],
                "country_name": row[1],
                "clicks": row[2],
                "unique_visitors": row[3],
                "percentage": row[4]
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/utm-sources")
async def get_utm_sources(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(get_current_user)
):
    """Get UTM source breakdown (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                ifNull(utm_source, 'direct') as source,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY source
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"user_id": user_id, "days": days, "limit": limit}
        )
        
        return [
            {
                "source": row[0],
                "clicks": row[1],
                "unique_visitors": row[2],
                "percentage": row[3]
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/utm-mediums")
async def get_utm_mediums(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(get_current_user)
):
    """Get UTM medium breakdown (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                ifNull(utm_medium, 'none') as medium,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY medium
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"user_id": user_id, "days": days, "limit": limit}
        )
        
        return [
            {
                "medium": row[0],
                "clicks": row[1],
                "unique_visitors": row[2],
                "percentage": row[3]
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/utm-campaigns")
async def get_utm_campaigns(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(get_current_user)
):
    """Get UTM campaign breakdown (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                ifNull(utm_campaign, 'none') as campaign,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY campaign
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"user_id": user_id, "days": days, "limit": limit}
        )
        
        return [
            {
                "campaign": row[0],
                "clicks": row[1],
                "unique_visitors": row[2],
                "percentage": row[3]
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return []


@app.get("/api/analytics/link/{link_id}")
async def get_link_analytics(
    link_id: str,
    days: int = 30,
    user: TokenPayload = Depends(get_current_user)
):
    """Get detailed analytics for a specific link."""
    client = get_clickhouse_client()
    
    try:
        link_uuid = UUID(link_id)
        
        overview = client.execute(
            """
            SELECT 
                count() as total_clicks,
                uniqExact(ip_hash) as unique_visitors,
                countIf(date = today()) as clicks_today,
                countIf(date >= today() - 7) as clicks_this_week,
                countIf(date >= today() - 30) as clicks_this_month
            FROM click_events
            WHERE link_id = %(link_id)s
            """,
            {"link_id": link_uuid}
        )[0]
        
        clicks_over_time = client.execute(
            """
            SELECT date, count() as clicks, uniqExact(ip_hash) as unique_visitors
            FROM click_events
            WHERE link_id = %(link_id)s AND date >= today() - %(days)s
            GROUP BY date
            ORDER BY date
            """,
            {"link_id": link_uuid, "days": days}
        )
        
        devices = client.execute(
            """
            SELECT ifNull(device_type, 'unknown') as device, count() as clicks
            FROM click_events
            WHERE link_id = %(link_id)s AND date >= today() - %(days)s
            GROUP BY device ORDER BY clicks DESC
            """,
            {"link_id": link_uuid, "days": days}
        )
        
        browsers = client.execute(
            """
            SELECT ifNull(browser_name, 'unknown') as browser, count() as clicks
            FROM click_events
            WHERE link_id = %(link_id)s AND date >= today() - %(days)s
            GROUP BY browser ORDER BY clicks DESC LIMIT 10
            """,
            {"link_id": link_uuid, "days": days}
        )
        
        referrers = client.execute(
            """
            SELECT if(referrer = '' OR referrer IS NULL, 'Direct', domain(referrer)) as ref, count() as clicks
            FROM click_events
            WHERE link_id = %(link_id)s AND date >= today() - %(days)s
            GROUP BY ref ORDER BY clicks DESC LIMIT 10
            """,
            {"link_id": link_uuid, "days": days}
        )
        
        countries = client.execute(
            """
            SELECT ifNull(country_code, 'unknown') as code, ifNull(country_name, 'Unknown') as name, count() as clicks
            FROM click_events
            WHERE link_id = %(link_id)s AND date >= today() - %(days)s
            GROUP BY code, name ORDER BY clicks DESC LIMIT 10
            """,
            {"link_id": link_uuid, "days": days}
        )
        
        utm_sources = client.execute(
            """
            SELECT ifNull(utm_source, 'direct') as source, count() as clicks
            FROM click_events
            WHERE link_id = %(link_id)s AND date >= today() - %(days)s
            GROUP BY source ORDER BY clicks DESC LIMIT 10
            """,
            {"link_id": link_uuid, "days": days}
        )
        
        return {
            "overview": {
                "total_clicks": overview[0],
                "unique_visitors": overview[1],
                "clicks_today": overview[2],
                "clicks_this_week": overview[3],
                "clicks_this_month": overview[4]
            },
            "clicks_over_time": [
                {"date": str(row[0]), "clicks": row[1], "unique_visitors": row[2]}
                for row in clicks_over_time
            ],
            "devices": [
                {"device_type": row[0], "clicks": row[1]}
                for row in devices
            ],
            "browsers": [
                {"browser": row[0], "clicks": row[1]}
                for row in browsers
            ],
            "referrers": [
                {"referrer": row[0], "clicks": row[1]}
                for row in referrers
            ],
            "countries": [
                {"country_code": row[0], "country_name": row[1], "clicks": row[2]}
                for row in countries
            ],
            "utm_sources": [
                {"source": row[0], "clicks": row[1]}
                for row in utm_sources
            ]
        }
    except Exception as e:
        logger.error(f"Link analytics query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/campaign/{campaign_id}")
async def get_campaign_analytics(
    campaign_id: str,
    days: int = 30,
    user: TokenPayload = Depends(get_current_user)
):
    """Get detailed analytics for a specific campaign."""
    client = get_clickhouse_client()
    
    try:
        campaign_uuid = UUID(campaign_id)
        
        overview = client.execute(
            """
            SELECT 
                count() as total_clicks,
                uniqExact(ip_hash) as unique_visitors,
                uniqExact(link_id) as total_links,
                countIf(date = today()) as clicks_today,
                countIf(date >= today() - 7) as clicks_this_week,
                countIf(date >= today() - 30) as clicks_this_month
            FROM click_events
            WHERE campaign_id = %(campaign_id)s
            """,
            {"campaign_id": campaign_uuid}
        )[0]
        
        clicks_over_time = client.execute(
            """
            SELECT date, count() as clicks, uniqExact(ip_hash) as unique_visitors
            FROM click_events
            WHERE campaign_id = %(campaign_id)s AND date >= today() - %(days)s
            GROUP BY date
            ORDER BY date
            """,
            {"campaign_id": campaign_uuid, "days": days}
        )
        
        top_links = client.execute(
            """
            SELECT link_id, short_code, count() as clicks, uniqExact(ip_hash) as unique_visitors
            FROM click_events
            WHERE campaign_id = %(campaign_id)s AND date >= today() - %(days)s
            GROUP BY link_id, short_code
            ORDER BY clicks DESC
            LIMIT 10
            """,
            {"campaign_id": campaign_uuid, "days": days}
        )
        
        devices = client.execute(
            """
            SELECT ifNull(device_type, 'unknown') as device, count() as clicks
            FROM click_events
            WHERE campaign_id = %(campaign_id)s AND date >= today() - %(days)s
            GROUP BY device ORDER BY clicks DESC
            """,
            {"campaign_id": campaign_uuid, "days": days}
        )
        
        return {
            "overview": {
                "total_clicks": overview[0],
                "unique_visitors": overview[1],
                "total_links": overview[2],
                "clicks_today": overview[3],
                "clicks_this_week": overview[4],
                "clicks_this_month": overview[5]
            },
            "clicks_over_time": [
                {"date": str(row[0]), "clicks": row[1], "unique_visitors": row[2]}
                for row in clicks_over_time
            ],
            "top_links": [
                {
                    "link_id": str(row[0]) if row[0] else None,
                    "short_code": row[1],
                    "clicks": row[2],
                    "unique_visitors": row[3]
                }
                for row in top_links
            ],
            "devices": [
                {"device_type": row[0], "clicks": row[1]}
                for row in devices
            ]
        }
    except Exception as e:
        logger.error(f"Campaign analytics query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/hourly")
async def get_hourly_clicks(
    days: int = 7,
    user: TokenPayload = Depends(get_current_user)
):
    """Get hourly click distribution (filtered by user_id)."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        result = client.execute(
            """
            SELECT 
                toHour(timestamp) as hour,
                count() as clicks
            FROM click_events
            WHERE user_id = %(user_id)s AND date >= today() - %(days)s
            GROUP BY hour
            ORDER BY hour
            """,
            {"user_id": user_id, "days": days}
        )
        
        return [
            {"hour": row[0], "clicks": row[1]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Hourly analytics query error: {e}")
        return []


@app.get("/api/analytics/realtime")
async def get_realtime_stats(user: TokenPayload = Depends(get_current_user)):
    """Get real-time analytics (last hour) filtered by user_id."""
    client = get_clickhouse_client()
    user_id = UUID(user.sub)
    
    try:
        clicks_last_hour = client.execute(
            """
            SELECT count() FROM click_events 
            WHERE user_id = %(user_id)s AND timestamp >= now() - INTERVAL 1 HOUR
            """,
            {"user_id": user_id}
        )[0][0]
        
        clicks_last_5_min = client.execute(
            """
            SELECT count() FROM click_events 
            WHERE user_id = %(user_id)s AND timestamp >= now() - INTERVAL 5 MINUTE
            """,
            {"user_id": user_id}
        )[0][0]
        
        active_links = client.execute(
            """
            SELECT uniqExact(link_id) FROM click_events 
            WHERE user_id = %(user_id)s AND timestamp >= now() - INTERVAL 1 HOUR
            """,
            {"user_id": user_id}
        )[0][0]
        
        recent_clicks = client.execute(
            """
            SELECT short_code, destination_url, timestamp
            FROM click_events
            WHERE user_id = %(user_id)s AND timestamp >= now() - INTERVAL 1 HOUR
            ORDER BY timestamp DESC
            LIMIT 10
            """,
            {"user_id": user_id}
        )
        
        return {
            "clicks_last_hour": clicks_last_hour,
            "clicks_last_5_min": clicks_last_5_min,
            "active_links": active_links,
            "recent_clicks": [
                {
                    "short_code": row[0],
                    "destination_url": row[1],
                    "timestamp": row[2].isoformat() if row[2] else None
                }
                for row in recent_clicks
            ]
        }
    except Exception as e:
        logger.error(f"Realtime analytics query error: {e}")
        return {
            "clicks_last_hour": 0,
            "clicks_last_5_min": 0,
            "active_links": 0,
            "recent_clicks": []
        }


# --- Admin analytics (platform-wide, no user_id filter) ---

@app.get("/api/analytics/admin/overview")
async def get_admin_overview(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide analytics overview (admin only)."""
    client = get_clickhouse_client()
    try:
        total_clicks = client.execute("SELECT count() FROM click_events")[0][0]
        unique_visitors = client.execute("SELECT uniqExact(ip_hash) FROM click_events")[0][0]
        clicks_today = client.execute(
            "SELECT count() FROM click_events WHERE date = today()"
        )[0][0]
        clicks_this_week = client.execute(
            "SELECT count() FROM click_events WHERE date >= today() - 7"
        )[0][0]
        clicks_this_month = client.execute(
            "SELECT count() FROM click_events WHERE date >= today() - 30"
        )[0][0]
        clicks_last_week = client.execute(
            """SELECT count() FROM click_events
               WHERE date >= today() - 14 AND date < today() - 7"""
        )[0][0]
        clicks_prev_month = client.execute(
            """SELECT count() FROM click_events
               WHERE date >= today() - 60 AND date < today() - 30"""
        )[0][0]
        unique_visitors_this_week = client.execute(
            """SELECT uniqExact(ip_hash) FROM click_events
               WHERE date >= today() - 7"""
        )[0][0]
        unique_visitors_last_week = client.execute(
            """SELECT uniqExact(ip_hash) FROM click_events
               WHERE date >= today() - 14 AND date < today() - 7"""
        )[0][0]
        clicks_yesterday = client.execute(
            "SELECT count() FROM click_events WHERE date = today() - 1"
        )[0][0]

        def calc_growth(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round(((current - previous) / previous) * 100, 1)

        return {
            "total_clicks": total_clicks,
            "unique_visitors": unique_visitors,
            "clicks_today": clicks_today,
            "clicks_this_week": clicks_this_week,
            "clicks_this_month": clicks_this_month,
            "clicks_growth": calc_growth(clicks_this_week, clicks_last_week),
            "visitors_growth": calc_growth(unique_visitors_this_week, unique_visitors_last_week),
            "today_growth": calc_growth(clicks_today, clicks_yesterday),
        }
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return {
            "total_clicks": 0,
            "unique_visitors": 0,
            "clicks_today": 0,
            "clicks_this_week": 0,
            "clicks_this_month": 0,
            "clicks_growth": 0,
            "visitors_growth": 0,
            "today_growth": 0,
        }


@app.get("/api/analytics/admin/clicks-over-time")
async def get_admin_clicks_over_time(
    days: int = 30,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide clicks over time (admin only)."""
    client = get_clickhouse_client()
    start = parse_date(start_date)
    end = parse_date(end_date)
    try:
        if start and end:
            result = client.execute(
                """
                SELECT date, count() as clicks, uniqExact(ip_hash) as unique_visitors
                FROM click_events
                WHERE date >= %(start)s AND date <= %(end)s
                GROUP BY date
                ORDER BY date
                """,
                {"start": start.date(), "end": end.date()},
            )
        else:
            result = client.execute(
                """
                SELECT date, count() as clicks, uniqExact(ip_hash) as unique_visitors
                FROM click_events
                WHERE date >= today() - %(days)s
                GROUP BY date
                ORDER BY date
                """,
                {"days": days},
            )
        return [
            {"date": str(row[0]), "clicks": row[1], "unique_visitors": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/top-links")
async def get_admin_top_links(
    limit: int = 10,
    days: int = 30,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide top links (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                link_id,
                short_code,
                any(destination_url) as destination_url,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY link_id, short_code
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"limit": limit, "days": days},
        )
        return [
            {
                "link_id": str(row[0]) if row[0] else None,
                "short_code": row[1],
                "destination_url": row[2],
                "clicks": row[3],
                "unique_visitors": row[4],
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/devices")
async def get_admin_devices(
    days: int = 30,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide device breakdown (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                ifNull(device_type, 'unknown') as device,
                count() as clicks,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY device
            ORDER BY clicks DESC
            """,
            {"days": days},
        )
        return [
            {"device_type": row[0], "clicks": row[1], "percentage": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/browsers")
async def get_admin_browsers(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide browser breakdown (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                ifNull(browser_name, 'unknown') as browser,
                count() as clicks,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY browser
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"days": days, "limit": limit},
        )
        return [
            {"browser": row[0], "clicks": row[1], "percentage": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/operating-systems")
async def get_admin_os(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide OS breakdown (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                ifNull(os_name, 'unknown') as os,
                count() as clicks,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY os
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"days": days, "limit": limit},
        )
        return [
            {"os": row[0], "clicks": row[1], "percentage": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/referrers")
async def get_admin_referrers(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide referrer breakdown (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                if(referrer = '' OR referrer IS NULL, 'Direct', domain(referrer)) as referrer_domain,
                count() as clicks,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY referrer_domain
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"days": days, "limit": limit},
        )
        return [
            {"referrer": row[0] or "Direct", "clicks": row[1], "percentage": row[2]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/countries")
async def get_admin_countries(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide country breakdown (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                ifNull(country_code, 'unknown') as country_code,
                ifNull(country_name, 'Unknown') as country_name,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY country_code, country_name
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"days": days, "limit": limit},
        )
        return [
            {
                "country_code": row[0],
                "country_name": row[1],
                "clicks": row[2],
                "unique_visitors": row[3],
                "percentage": row[4],
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/hourly")
async def get_admin_hourly(
    days: int = 7,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide hourly click distribution (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT toHour(timestamp) as hour, count() as clicks
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY hour
            ORDER BY hour
            """,
            {"days": days},
        )
        return [{"hour": row[0], "clicks": row[1]} for row in result]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/utm-sources")
async def get_admin_utm_sources(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide UTM source breakdown (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                ifNull(utm_source, 'direct') as source,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY source
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"days": days, "limit": limit},
        )
        return [
            {"source": row[0], "clicks": row[1], "unique_visitors": row[2], "percentage": row[3]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/utm-mediums")
async def get_admin_utm_mediums(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide UTM medium breakdown (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                ifNull(utm_medium, 'none') as medium,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY medium
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"days": days, "limit": limit},
        )
        return [
            {"medium": row[0], "clicks": row[1], "unique_visitors": row[2], "percentage": row[3]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/utm-campaigns")
async def get_admin_utm_campaigns(
    days: int = 30,
    limit: int = 10,
    user: TokenPayload = Depends(require_admin)
):
    """Platform-wide UTM campaign breakdown (admin only)."""
    client = get_clickhouse_client()
    try:
        result = client.execute(
            """
            SELECT
                ifNull(utm_campaign, 'none') as campaign,
                count() as clicks,
                uniqExact(ip_hash) as unique_visitors,
                round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
            FROM click_events
            WHERE date >= today() - %(days)s
            GROUP BY campaign
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"days": days, "limit": limit},
        )
        return [
            {"campaign": row[0], "clicks": row[1], "unique_visitors": row[2], "percentage": row[3]}
            for row in result
        ]
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return []


@app.get("/api/analytics/admin/realtime")
async def get_admin_realtime(user: TokenPayload = Depends(require_admin)):
    """Platform-wide real-time stats (admin only)."""
    client = get_clickhouse_client()
    try:
        clicks_last_hour = client.execute(
            """
            SELECT count() FROM click_events
            WHERE timestamp >= now() - INTERVAL 1 HOUR
            """
        )[0][0]
        clicks_last_5_min = client.execute(
            """
            SELECT count() FROM click_events
            WHERE timestamp >= now() - INTERVAL 5 MINUTE
            """
        )[0][0]
        active_links = client.execute(
            """
            SELECT uniqExact(link_id) FROM click_events
            WHERE timestamp >= now() - INTERVAL 1 HOUR
            """
        )[0][0]
        recent_clicks = client.execute(
            """
            SELECT short_code, destination_url, timestamp
            FROM click_events
            WHERE timestamp >= now() - INTERVAL 1 HOUR
            ORDER BY timestamp DESC
            LIMIT 10
            """
        )
        return {
            "clicks_last_hour": clicks_last_hour,
            "clicks_last_5_min": clicks_last_5_min,
            "active_links": active_links,
            "recent_clicks": [
                {
                    "short_code": row[0],
                    "destination_url": row[1],
                    "timestamp": row[2].isoformat() if row[2] else None,
                }
                for row in recent_clicks
            ],
        }
    except Exception as e:
        logger.error(f"Admin analytics query error: {e}")
        return {
            "clicks_last_hour": 0,
            "clicks_last_5_min": 0,
            "active_links": 0,
            "recent_clicks": [],
        }


def run_api():
    """Run the FastAPI server."""
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


async def main():
    """Main entry point."""
    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()
    
    def handle_shutdown(sig, frame):
        logger.info(f"Received signal {sig}, shutting down...")
        shutdown_event.set()
    
    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)
    
    await consume_events()


if __name__ == "__main__":
    asyncio.run(main())
