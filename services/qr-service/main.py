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


@app.get("/qr-files/{file_path:path}")
async def serve_qr_file(file_path: str):
    """Serve QR code files from local storage (for development)."""
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    from pathlib import Path
    base = Path("/app/qr-storage")
    full_path = (base / file_path).resolve()
    if not str(full_path).startswith(str(base.resolve())) or not full_path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    media_type = "image/svg+xml" if full_path.suffix.lower() == ".svg" else "image/png"
    return FileResponse(full_path, media_type=media_type)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "qr-service"}
