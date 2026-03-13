"""Event Collector Service - Receives click events and pushes to Kafka."""

import sys
sys.path.insert(0, '/app')

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError

from config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

producer: Optional[AIOKafkaProducer] = None


class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def serialize(msg):
    return json.dumps(msg, cls=JSONEncoder).encode('utf-8')


@asynccontextmanager
async def lifespan(app: FastAPI):
    global producer
    
    producer = AIOKafkaProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        value_serializer=serialize,
        key_serializer=lambda k: k.encode('utf-8') if k else None,
        acks='all',
        enable_idempotence=True,
        max_batch_size=16384,
        linger_ms=10,
    )
    
    await producer.start()
    logger.info(f"Kafka producer connected to {settings.kafka_bootstrap_servers}")
    
    yield
    
    await producer.stop()
    logger.info("Kafka producer stopped")


app = FastAPI(
    title="Bitly Event Collector",
    description="Collects click events and pushes to Kafka",
    version="1.0.0",
    lifespan=lifespan,
)


class ClickEvent(BaseModel):
    link_id: str
    campaign_id: Optional[str] = None
    store_id: Optional[str] = None
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    short_code: str
    destination_url: str
    timestamp: str
    ip_hash: str
    user_agent: str
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "event-collector"}


@app.post("/api/events/click", status_code=status.HTTP_202_ACCEPTED)
async def receive_click_event(event: ClickEvent):
    """
    Receive a click event and push it to Kafka.
    
    This endpoint is called by the redirect service after a successful redirect.
    Events are processed asynchronously by the analytics processor.
    """
    try:
        event_data = event.model_dump()
        
        await producer.send_and_wait(
            settings.kafka_topic,
            value=event_data,
            key=event.link_id
        )
        
        logger.debug(f"Event sent to Kafka: {event.link_id}")
        
        return {"status": "accepted", "event_id": event.link_id}
        
    except KafkaError as e:
        logger.error(f"Kafka error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to queue event"
        )
    except Exception as e:
        logger.error(f"Error processing event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.post("/api/events/batch", status_code=status.HTTP_202_ACCEPTED)
async def receive_batch_events(events: list[ClickEvent]):
    """
    Receive multiple click events and push them to Kafka.
    
    Useful for batch processing or catching up on missed events.
    """
    success_count = 0
    error_count = 0
    
    for event in events:
        try:
            event_data = event.model_dump()
            
            await producer.send_and_wait(
                settings.kafka_topic,
                value=event_data,
                key=event.link_id
            )
            
            success_count += 1
            
        except Exception as e:
            logger.error(f"Error processing batch event: {e}")
            error_count += 1
    
    return {
        "status": "completed",
        "success_count": success_count,
        "error_count": error_count
    }
