"""Business logic for QR service."""

from typing import Optional, List
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import QRCode, Link
from schemas import QRCodeCreate, QRStyleConfig
from qr_generator import generate_qr_code, generate_qr_svg, download_logo
from s3_client import get_s3_client, get_s3_key
from config import get_settings

settings = get_settings()


class QRCodeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.s3 = get_s3_client()
    
    async def get_by_id(self, qr_id: UUID) -> Optional[QRCode]:
        """Get QR code by ID."""
        result = await self.db.execute(
            select(QRCode)
            .options(selectinload(QRCode.link))
            .where(QRCode.id == qr_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_link(self, link_id: UUID) -> List[QRCode]:
        """Get all QR codes for a link."""
        result = await self.db.execute(
            select(QRCode).where(QRCode.link_id == link_id)
        )
        return list(result.scalars().all())
    
    async def get_link(self, link_id: UUID, user_id: UUID) -> Optional[Link]:
        """Get link by ID and verify ownership."""
        result = await self.db.execute(
            select(Link).where(Link.id == link_id, Link.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def create(
        self,
        user_id: UUID,
        data: QRCodeCreate
    ) -> QRCode:
        """Create a new QR code."""
        link = await self.get_link(data.link_id, user_id)
        if link is None:
            raise ValueError("Link not found")
        
        short_url = f"{settings.short_domain}/{link.short_code}"
        
        logo = None
        if data.style_config.logo_url:
            logo = await download_logo(data.style_config.logo_url)
        
        if data.file_format == "png":
            image_bytes, width, height, file_size = generate_qr_code(
                short_url,
                data.style_config,
                logo
            )
            content_type = "image/png"
        else:
            image_bytes, file_size = generate_qr_svg(short_url, data.style_config)
            width = height = data.style_config.box_size * 25
            content_type = "image/svg+xml"
        
        qr_id = uuid4()
        s3_key = get_s3_key(str(user_id), str(data.link_id), str(qr_id), data.file_format)
        
        uploaded = await self.s3.upload_file(image_bytes, s3_key, content_type)
        if not uploaded:
            raise ValueError("Failed to upload QR code to storage")
        
        qr_code = QRCode(
            id=qr_id,
            link_id=data.link_id,
            s3_key=s3_key,
            s3_bucket=settings.aws_s3_bucket,
            file_format=data.file_format,
            style_config=data.style_config.model_dump(),
            file_size=file_size,
            width=width,
            height=height
        )
        
        self.db.add(qr_code)
        await self.db.flush()
        await self.db.refresh(qr_code)
        
        return qr_code
    
    async def regenerate(
        self,
        qr_code: QRCode,
        user_id: UUID,
        style_config: Optional[QRStyleConfig] = None
    ) -> QRCode:
        """Regenerate a QR code with new style."""
        link = await self.get_link(qr_code.link_id, user_id)
        if link is None:
            raise ValueError("Link not found")
        
        if style_config:
            qr_code.style_config = style_config.model_dump()
        
        style = QRStyleConfig(**qr_code.style_config)
        short_url = f"{settings.short_domain}/{link.short_code}"
        
        logo = None
        if style.logo_url:
            logo = await download_logo(style.logo_url)
        
        if qr_code.file_format == "png":
            image_bytes, width, height, file_size = generate_qr_code(
                short_url,
                style,
                logo
            )
            content_type = "image/png"
        else:
            image_bytes, file_size = generate_qr_svg(short_url, style)
            width = height = style.box_size * 25
            content_type = "image/svg+xml"
        
        uploaded = await self.s3.upload_file(image_bytes, qr_code.s3_key, content_type)
        if not uploaded:
            raise ValueError("Failed to upload QR code to storage")
        
        qr_code.file_size = file_size
        qr_code.width = width
        qr_code.height = height
        
        await self.db.flush()
        await self.db.refresh(qr_code)
        
        return qr_code
    
    async def delete(self, qr_code: QRCode) -> None:
        """Delete a QR code."""
        await self.s3.delete_file(qr_code.s3_key)
        await self.db.delete(qr_code)
        await self.db.flush()
    
    async def get_download_url(self, qr_code: QRCode, expires_in: int = 3600) -> Optional[str]:
        """Get presigned download URL."""
        return await self.s3.get_presigned_url(qr_code.s3_key, expires_in)
