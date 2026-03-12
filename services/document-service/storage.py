"""Storage client for documents - supports S3 or local filesystem."""

import io
from pathlib import Path
from typing import Optional

from config import get_settings

settings = get_settings()


class LocalStorageClient:
    """Local filesystem storage for development."""

    def __init__(self):
        self.base_path = Path("/app/document-storage")
        self.base_path.mkdir(parents=True, exist_ok=True)
        base = settings.short_domain.replace("/r", "").rstrip("/")
        self.base_url = f"{base}/api/documents"

    async def upload_file(
        self,
        file_data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> bool:
        try:
            file_path = self.base_path / key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(file_data)
            return True
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"LocalStorage upload failed for {key}: {e}")
            return False

    async def get_file(self, key: str) -> Optional[bytes]:
        try:
            file_path = self.base_path / key
            if file_path.exists():
                return file_path.read_bytes()
        except Exception:
            pass
        return None

    async def delete_file(self, key: str) -> bool:
        try:
            file_path = self.base_path / key
            if file_path.exists():
                file_path.unlink()
            return True
        except Exception:
            return False

    async def file_exists(self, key: str) -> bool:
        return (self.base_path / key).exists()

    def get_public_url(self, doc_id: str) -> str:
        return f"{self.base_url}/{doc_id}"


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
                "s3",
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region,
            )
        else:
            self._client = boto3.client("s3", region_name=settings.aws_region)

    async def upload_file(
        self,
        file_data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> bool:
        try:
            self._client.upload_fileobj(
                io.BytesIO(file_data),
                self.bucket,
                key,
                ExtraArgs={"ContentType": content_type},
            )
            return True
        except self.ClientError:
            return False

    async def get_file(self, key: str) -> Optional[bytes]:
        try:
            buffer = io.BytesIO()
            self._client.download_fileobj(self.bucket, key, buffer)
            buffer.seek(0)
            return buffer.read()
        except self.ClientError:
            return None

    async def delete_file(self, key: str) -> bool:
        try:
            self._client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except self.ClientError:
            return False

    async def file_exists(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self.bucket, Key=key)
            return True
        except self.ClientError:
            return False

    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        try:
            return self._client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except self.ClientError:
            return None


def get_storage_key(user_id: str, doc_id: str, filename: str) -> str:
    """Generate storage key for a document."""
    safe_name = "".join(c if c.isalnum() or c in ".-_" else "_" for c in filename)
    return f"documents/{user_id}/{doc_id}/{safe_name}"


_storage_client = None


def get_storage_client():
    """Get storage client - uses local storage if S3 not configured."""
    global _storage_client
    if _storage_client is None:
        if (
            settings.aws_access_key_id
            and settings.aws_access_key_id != "your-aws-access-key"
            and settings.aws_secret_access_key
            and settings.aws_secret_access_key != "your-aws-secret-key"
        ):
            _storage_client = S3Client()
        else:
            _storage_client = LocalStorageClient()
    return _storage_client
