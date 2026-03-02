"""AWS S3 client wrapper for file storage."""

import io
import logging
from typing import BinaryIO, Optional
from datetime import timedelta

import boto3
from botocore.exceptions import ClientError

from .config import get_settings

logger = logging.getLogger(__name__)


class S3Client:
    """AWS S3 client wrapper."""
    
    def __init__(
        self,
        access_key_id: str | None = None,
        secret_access_key: str | None = None,
        bucket: str | None = None,
        region: str | None = None
    ):
        settings = get_settings()
        
        self.access_key_id = access_key_id or settings.aws_access_key_id
        self.secret_access_key = secret_access_key or settings.aws_secret_access_key
        self.bucket = bucket or settings.aws_s3_bucket
        self.region = region or settings.aws_region
        
        self._client = None
    
    @property
    def client(self):
        """Get or create the S3 client."""
        if self._client is None:
            self._client = boto3.client(
                's3',
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name=self.region
            )
        return self._client
    
    async def upload_file(
        self,
        file_obj: BinaryIO | bytes,
        key: str,
        content_type: str = "application/octet-stream",
        metadata: dict | None = None
    ) -> bool:
        """
        Upload a file to S3.
        
        Args:
            file_obj: File object or bytes to upload
            key: S3 object key (path)
            content_type: MIME type of the file
            metadata: Optional metadata dict
        
        Returns:
            True if successful, False otherwise
        """
        try:
            extra_args = {"ContentType": content_type}
            if metadata:
                extra_args["Metadata"] = metadata
            
            if isinstance(file_obj, bytes):
                file_obj = io.BytesIO(file_obj)
            
            self.client.upload_fileobj(
                file_obj,
                self.bucket,
                key,
                ExtraArgs=extra_args
            )
            
            logger.info(f"Uploaded file to S3: {key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            return False
    
    async def download_file(self, key: str) -> Optional[bytes]:
        """
        Download a file from S3.
        
        Args:
            key: S3 object key
        
        Returns:
            File contents as bytes, or None if not found
        """
        try:
            buffer = io.BytesIO()
            self.client.download_fileobj(self.bucket, key, buffer)
            buffer.seek(0)
            return buffer.read()
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.warning(f"File not found in S3: {key}")
            else:
                logger.error(f"Failed to download from S3: {e}")
            return None
    
    async def delete_file(self, key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            key: S3 object key
        
        Returns:
            True if successful
        """
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"Deleted file from S3: {key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False
    
    async def file_exists(self, key: str) -> bool:
        """Check if a file exists in S3."""
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False
    
    async def get_presigned_url(
        self,
        key: str,
        expires_in: int | timedelta = 3600,
        method: str = "get_object"
    ) -> Optional[str]:
        """
        Generate a presigned URL for an S3 object.
        
        Args:
            key: S3 object key
            expires_in: URL expiration in seconds or timedelta
            method: S3 operation ('get_object' or 'put_object')
        
        Returns:
            Presigned URL string, or None on error
        """
        try:
            if isinstance(expires_in, timedelta):
                expires_in = int(expires_in.total_seconds())
            
            url = self.client.generate_presigned_url(
                ClientMethod=method,
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in
            )
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
    
    async def get_file_info(self, key: str) -> Optional[dict]:
        """
        Get metadata about an S3 object.
        
        Returns:
            Dict with ContentLength, ContentType, LastModified, etc.
        """
        try:
            response = self.client.head_object(Bucket=self.bucket, Key=key)
            return {
                "content_length": response.get("ContentLength"),
                "content_type": response.get("ContentType"),
                "last_modified": response.get("LastModified"),
                "metadata": response.get("Metadata", {})
            }
        except ClientError:
            return None
    
    async def list_files(
        self,
        prefix: str = "",
        max_keys: int = 1000
    ) -> list[dict]:
        """
        List files in S3 bucket with optional prefix.
        
        Returns:
            List of dicts with Key, Size, LastModified
        """
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            files = []
            for obj in response.get("Contents", []):
                files.append({
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"]
                })
            
            return files
            
        except ClientError as e:
            logger.error(f"Failed to list S3 files: {e}")
            return []


# ===========================================
# S3 Key Patterns
# ===========================================

class S3Keys:
    """S3 key patterns for different file types."""
    
    QR_CODE = "qr-codes/{user_id}/{link_id}/{qr_id}.{format}"
    LOGO = "logos/{user_id}/{filename}"
    
    @classmethod
    def qr_code(cls, user_id: str, link_id: str, qr_id: str, format: str = "png") -> str:
        return cls.QR_CODE.format(
            user_id=user_id,
            link_id=link_id,
            qr_id=qr_id,
            format=format
        )
    
    @classmethod
    def logo(cls, user_id: str, filename: str) -> str:
        return cls.LOGO.format(user_id=user_id, filename=filename)


# ===========================================
# Global S3 client instance
# ===========================================

_s3_client: S3Client | None = None


def get_s3_client() -> S3Client:
    """Get or create the global S3 client."""
    global _s3_client
    if _s3_client is None:
        _s3_client = S3Client()
    return _s3_client
