"""Kafka producer and consumer clients."""

import json
import logging
from typing import Any, Callable, Optional
from uuid import UUID

from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
from aiokafka.errors import KafkaError

from .config import get_settings

logger = logging.getLogger(__name__)


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles UUIDs and datetimes."""
    
    def default(self, obj: Any) -> Any:
        if isinstance(obj, UUID):
            return str(obj)
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        return super().default(obj)


def serialize_message(message: dict) -> bytes:
    """Serialize a message to JSON bytes."""
    return json.dumps(message, cls=JSONEncoder).encode('utf-8')


def deserialize_message(data: bytes) -> dict:
    """Deserialize a message from JSON bytes."""
    return json.loads(data.decode('utf-8'))


class KafkaProducer:
    """Async Kafka producer."""
    
    def __init__(self, bootstrap_servers: str | None = None):
        self.bootstrap_servers = bootstrap_servers or get_settings().kafka_bootstrap_servers
        self._producer: AIOKafkaProducer | None = None
        self._started = False
    
    async def start(self) -> None:
        """Start the Kafka producer."""
        if self._started:
            return
        
        self._producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=serialize_message,
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            acks='all',
            enable_idempotence=True,
            max_batch_size=16384,
            linger_ms=10,
        )
        await self._producer.start()
        self._started = True
        logger.info(f"Kafka producer started: {self.bootstrap_servers}")
    
    async def stop(self) -> None:
        """Stop the Kafka producer."""
        if self._producer is not None:
            await self._producer.stop()
            self._producer = None
            self._started = False
            logger.info("Kafka producer stopped")
    
    async def send(
        self, 
        topic: str, 
        message: dict, 
        key: str | None = None
    ) -> bool:
        """Send a message to a Kafka topic."""
        if not self._started:
            await self.start()
        
        try:
            await self._producer.send_and_wait(topic, value=message, key=key)
            return True
        except KafkaError as e:
            logger.error(f"Failed to send message to Kafka: {e}")
            return False
    
    async def send_batch(
        self, 
        topic: str, 
        messages: list[dict],
        key_fn: Callable[[dict], str] | None = None
    ) -> int:
        """Send multiple messages to a Kafka topic."""
        if not self._started:
            await self.start()
        
        sent_count = 0
        for message in messages:
            key = key_fn(message) if key_fn else None
            if await self.send(topic, message, key):
                sent_count += 1
        
        return sent_count


class KafkaConsumer:
    """Async Kafka consumer."""
    
    def __init__(
        self,
        topics: list[str],
        group_id: str,
        bootstrap_servers: str | None = None,
        auto_offset_reset: str = "earliest"
    ):
        self.topics = topics
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers or get_settings().kafka_bootstrap_servers
        self.auto_offset_reset = auto_offset_reset
        self._consumer: AIOKafkaConsumer | None = None
        self._started = False
        self._running = False
    
    async def start(self) -> None:
        """Start the Kafka consumer."""
        if self._started:
            return
        
        self._consumer = AIOKafkaConsumer(
            *self.topics,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            value_deserializer=deserialize_message,
            auto_offset_reset=self.auto_offset_reset,
            enable_auto_commit=True,
            auto_commit_interval_ms=1000,
        )
        await self._consumer.start()
        self._started = True
        logger.info(f"Kafka consumer started: {self.bootstrap_servers}, topics: {self.topics}")
    
    async def stop(self) -> None:
        """Stop the Kafka consumer."""
        self._running = False
        if self._consumer is not None:
            await self._consumer.stop()
            self._consumer = None
            self._started = False
            logger.info("Kafka consumer stopped")
    
    async def consume(
        self, 
        handler: Callable[[dict], Any],
        batch_size: int = 100,
        batch_timeout_ms: int = 1000
    ) -> None:
        """
        Start consuming messages and process them with the handler.
        
        Args:
            handler: Async function to process each message
            batch_size: Maximum messages to process in a batch
            batch_timeout_ms: Timeout for collecting a batch
        """
        if not self._started:
            await self.start()
        
        self._running = True
        logger.info("Starting message consumption...")
        
        while self._running:
            try:
                messages = await self._consumer.getmany(
                    timeout_ms=batch_timeout_ms,
                    max_records=batch_size
                )
                
                for tp, msgs in messages.items():
                    for msg in msgs:
                        try:
                            await handler(msg.value)
                        except Exception as e:
                            logger.error(f"Error processing message: {e}")
                
            except KafkaError as e:
                logger.error(f"Kafka consumer error: {e}")
                await self._reconnect()
    
    async def _reconnect(self) -> None:
        """Attempt to reconnect to Kafka."""
        logger.info("Attempting to reconnect to Kafka...")
        if self._consumer is not None:
            try:
                await self._consumer.stop()
            except Exception:
                pass
        
        self._started = False
        self._consumer = None
        
        # Wait before reconnecting
        import asyncio
        await asyncio.sleep(5)
        
        try:
            await self.start()
        except Exception as e:
            logger.error(f"Failed to reconnect: {e}")


# ===========================================
# Kafka Topics
# ===========================================

class KafkaTopics:
    """Kafka topic names."""
    
    CLICK_EVENTS = "click-events"
    LINK_EVENTS = "link-events"


# ===========================================
# Global producer instance
# ===========================================

_kafka_producer: KafkaProducer | None = None


def get_kafka_producer() -> KafkaProducer:
    """Get or create the global Kafka producer."""
    global _kafka_producer
    if _kafka_producer is None:
        _kafka_producer = KafkaProducer()
    return _kafka_producer


async def close_kafka_producer() -> None:
    """Close the global Kafka producer."""
    global _kafka_producer
    if _kafka_producer is not None:
        await _kafka_producer.stop()
        _kafka_producer = None
