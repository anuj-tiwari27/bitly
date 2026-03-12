"""API routes for Document service."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import get_current_user_id
from services import DocumentService
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document. Returns document URL for use as link destination."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    max_size = 50 * 1024 * 1024  # 50MB
    content_type = file.content_type or "application/octet-stream"

    try:
        file_data = await file.read()
    except Exception as e:
        logger.error(f"Failed to read upload file: {e}")
        raise HTTPException(status_code=500, detail="Failed to read file")

    if len(file_data) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB.",
        )

    org_id = None

    service = DocumentService(db)
    try:
        doc = await service.create(
            user_id=user_id,
            organization_id=org_id,
            filename=file.filename,
            file_data=file_data,
            content_type=content_type,
        )
    except ValueError as e:
        logger.error(f"Document service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error during document upload: {e}")
        raise HTTPException(status_code=500, detail="Document upload failed")

    base = settings.get_app_base_url()
    doc_url = f"{base}/api/documents/{doc.id}"

    return {
        "id": str(doc.id),
        "filename": doc.original_filename,
        "content_type": doc.content_type,
        "file_size": doc.file_size,
        "url": doc_url,
    }


@router.get("/{doc_id}")
async def download_document(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Download/serve a document. Public endpoint - no auth required for access."""
    service = DocumentService(db)
    doc = await service.get_by_id_public(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    storage = service.storage
    file_data = await storage.get_file(doc.storage_key)
    if file_data is None:
        raise HTTPException(status_code=404, detail="Document file not found")

    return StreamingResponse(
        iter([file_data]),
        media_type=doc.content_type,
        headers={
            "Content-Disposition": f'inline; filename="{doc.original_filename}"',
            "Content-Length": str(doc.file_size),
        },
    )
