"""Document Service - Document upload and serving."""

import sys
from pathlib import Path

_svc_dir = str(Path(__file__).resolve().parent)
if _svc_dir not in sys.path:
    sys.path.insert(0, _svc_dir)

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
    title="Bitly Document Service",
    description="Document upload and serving for link/QR generation",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/documents", tags=["Documents"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "document-service"}
