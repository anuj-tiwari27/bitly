from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import QRCodeCreate, QRCodeUpdate, QRCodeResponse, QRStyleConfig
from auth import get_current_user_id
from services import QRCodeService

router = APIRouter()


async def qr_to_response(qr_code, service: QRCodeService) -> QRCodeResponse:
    download_url = await service.get_download_url(qr_code)
    
    return QRCodeResponse(
        id=qr_code.id,
        link_id=qr_code.link_id,
        file_format=qr_code.file_format,
        style_config=QRStyleConfig(**qr_code.style_config),
        download_url=download_url or "",
        file_size=qr_code.file_size,
        width=qr_code.width,
        height=qr_code.height,
        created_at=qr_code.created_at,
        updated_at=qr_code.updated_at
    )


@router.post("", response_model=QRCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_qr_code(
    data: QRCodeCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Generate a new QR code for a link."""
    service = QRCodeService(db)
    
    try:
        qr_code = await service.create(user_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    return await qr_to_response(qr_code, service)


@router.get("/{qr_id}", response_model=QRCodeResponse)
async def get_qr_code(
    qr_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get a QR code by ID."""
    service = QRCodeService(db)
    
    qr_code = await service.get_by_id(qr_id)
    
    if qr_code is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    link = await service.get_link(qr_code.link_id, user_id)
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    return await qr_to_response(qr_code, service)


@router.get("/link/{link_id}", response_model=list[QRCodeResponse])
async def get_qr_codes_for_link(
    link_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get all QR codes for a link."""
    service = QRCodeService(db)
    
    link = await service.get_link(link_id, user_id)
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )
    
    qr_codes = await service.get_by_link(link_id)
    
    return [await qr_to_response(qr, service) for qr in qr_codes]


@router.post("/{qr_id}/regenerate", response_model=QRCodeResponse)
async def regenerate_qr_code(
    qr_id: UUID,
    data: QRCodeUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Regenerate a QR code with optional new style."""
    service = QRCodeService(db)
    
    qr_code = await service.get_by_id(qr_id)
    
    if qr_code is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    try:
        qr_code = await service.regenerate(qr_code, user_id, data.style_config)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    return await qr_to_response(qr_code, service)


@router.delete("/{qr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_qr_code(
    qr_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a QR code."""
    service = QRCodeService(db)
    
    qr_code = await service.get_by_id(qr_id)
    
    if qr_code is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    link = await service.get_link(qr_code.link_id, user_id)
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found"
        )
    
    await service.delete(qr_code)
