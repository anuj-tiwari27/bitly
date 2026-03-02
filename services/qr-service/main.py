"""QR Service - QR code generation and management."""

import sys
sys.path.insert(0, '/app')

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routes import router
from database import close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_db()


settings = get_settings()

app = FastAPI(
    title="Bitly QR Service",
    description="QR code generation and management service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/qr", tags=["QR Codes"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "qr-service"}
