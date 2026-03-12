"""Business logic for Document service."""

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Document
from storage import get_storage_client, get_storage_key

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.storage = get_storage_client()

    async def get_by_id(self, doc_id: UUID, user_id: UUID) -> Document | None:
        result = await self.db.execute(
            select(Document).where(
                Document.id == doc_id,
                Document.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id_public(self, doc_id: UUID) -> Document | None:
        """Get document by ID for public download (no user check)."""
        result = await self.db.execute(select(Document).where(Document.id == doc_id))
        return result.scalar_one_or_none()

    async def create(
        self,
        user_id: UUID,
        organization_id: UUID | None,
        filename: str,
        file_data: bytes,
        content_type: str,
    ) -> Document:
        """
        Create a document record and persist the correct storage key.

        We first insert a placeholder row to obtain the document ID, then
        derive the storage key from that ID and update both the database
        row and the stored file path. It is important to flush AFTER
        setting the final storage_key so downloads can locate the file.
        """
        storage_key_placeholder = "pending"
        doc = Document(
            user_id=user_id,
            organization_id=organization_id,
            original_filename=filename,
            filename=filename,
            storage_key=storage_key_placeholder,
            content_type=content_type,
            file_size=len(file_data),
        )
        self.db.add(doc)
        # Initial flush to get generated ID for this document
        await self.db.flush()

        # Compute final storage key based on the persisted ID
        storage_key = get_storage_key(str(user_id), str(doc.id), filename)
        doc.storage_key = storage_key
        # Flush again so the updated storage_key is written to the database
        await self.db.flush()

        try:
            uploaded = await self.storage.upload_file(
                file_data, storage_key, content_type
            )
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            raise ValueError(f"Failed to upload document to storage: {e}")

        if not uploaded:
            raise ValueError("Failed to upload document to storage")

        await self.db.refresh(doc)
        return doc

    async def delete(self, doc: Document) -> None:
        await self.storage.delete_file(doc.storage_key)
        await self.db.delete(doc)
