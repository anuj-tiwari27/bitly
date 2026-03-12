"""Storage client for QR code storage - supports S3 or local filesystem."""

import io
import os
from pathlib import Path
from typing import Optional

from config import get_settings

settings = get_settings()


class LocalStorageClient:
    """Local filesystem storage for development/testing."""
    
    def __init__(self):
        self.base_path = Path("/app/qr-storage")
        self.base_path.mkdir(parents=True, exist_ok=True)
        # Use app_base_url if set; when localhost, use :3000 (frontend); else derive from short_domain
        base = settings.app_base_url
        if not base:
            short_base = settings.short_domain.replace("/r", "").rstrip("/")
            base = "http://localhost:3000" if "localhost" in short_base else short_base
        self.base_url = (base or "").rstrip("/") + "/qr-files"
    
    async def upload_file(
        self,
        file_data: bytes,
        key: str,
        content_type: str = "image/png"
    ) -> bool:
        """Save file to local filesystem."""
        try:
            file_path = self.base_path / key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(file_data)
            return True
        except Exception:
            return False
    
    async def delete_file(self, key: str) -> bool:
        """Delete file from local filesystem."""
        try:
            file_path = self.base_path / key
            if file_path.exists():
                file_path.unlink()
            return True
        except Exception:
            return False
    
    async def get_presigned_url(
        self,
        key: str,
        expires_in: int = 3600
    ) -> Optional[str]:
        """Return local URL for the file."""
        file_path = self.base_path / key
        if file_path.exists():
            return f"{self.base_url}/{key}"
        return None
    
    async def file_exists(self, key: str) -> bool:
        """Check if file exists locally."""
        return (self.base_path / key).exists()


class S3Client:
    """AWS S3 storage client."""
    
    def __init__(self):
        import boto3
        from botocore.exceptions import ClientError
        self.ClientError = ClientError
        
        self.bucket = settings.aws_s3_bucket
        self.region = settings.aws_region
        
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            self._client = boto3.client(
                's3',
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region
            )
        else:
            self._client = boto3.client('s3', region_name=settings.aws_region)
    
    async def upload_file(
        self,
        file_data: bytes,
        key: str,
        content_type: str = "image/png"
    ) -> bool:
        """Upload a file to S3."""
        try:
            self._client.upload_fileobj(
                io.BytesIO(file_data),
                self.bucket,
                key,
                ExtraArgs={"ContentType": content_type}
            )
            return True
        except self.ClientError:
            return False
    
    async def delete_file(self, key: str) -> bool:
        """Delete a file from S3."""
        try:
            self._client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except self.ClientError:
            return False
    
    async def get_presigned_url(
        self,
        key: str,
        expires_in: int = 3600
    ) -> Optional[str]:
        """Generate a presigned URL for download."""
        try:
            url = self._client.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in
            )
            return url
        except self.ClientError:
            return None
    
    async def file_exists(self, key: str) -> bool:
        """Check if a file exists in S3."""
        try:
            self._client.head_object(Bucket=self.bucket, Key=key)
            return True
        except self.ClientError:
            return False


def get_s3_key(user_id: str, link_id: str, qr_id: str, format: str = "png") -> str:
    """Generate storage key for a QR code."""
    return f"qr-codes/{user_id}/{link_id}/{qr_id}.{format}"


_storage_client = None


def get_s3_client():
    """Get storage client - uses local storage if S3 not configured."""
    global _storage_client
    if _storage_client is None:
        if (settings.aws_access_key_id and 
            settings.aws_access_key_id != "your-aws-access-key" and
            settings.aws_secret_access_key and
            settings.aws_secret_access_key != "your-aws-secret-key"):
            _storage_client = S3Client()
        else:
            _storage_client = LocalStorageClient()
    return _storage_client
