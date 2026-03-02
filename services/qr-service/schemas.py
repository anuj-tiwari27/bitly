from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class BaseSchema(BaseModel):
    class Config:
        from_attributes = True


class QRStyleConfig(BaseSchema):
    fill_color: str = "#000000"
    back_color: str = "#FFFFFF"
    box_size: int = Field(default=10, ge=1, le=50)
    border: int = Field(default=4, ge=0, le=20)
    logo_url: Optional[str] = None
    error_correction: str = Field(default="M", pattern="^[LMQH]$")


class QRCodeCreate(BaseSchema):
    link_id: UUID
    style_config: QRStyleConfig = QRStyleConfig()
    file_format: str = Field(default="png", pattern="^(png|svg)$")


class QRCodeUpdate(BaseSchema):
    style_config: Optional[QRStyleConfig] = None


class QRCodeResponse(BaseSchema):
    id: UUID
    link_id: UUID
    file_format: str
    style_config: QRStyleConfig
    download_url: str
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class QRCodeGenerateResponse(BaseSchema):
    id: UUID
    link_id: UUID
    download_url: str
    file_format: str
    width: int
    height: int
    file_size: int
