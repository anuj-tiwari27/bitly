-- Migration: Add organization_id to links table (if missing)
-- Run this if upgrading from a version without organization_id on links

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'links' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE links ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_links_org ON links(organization_id);
  END IF;
END $$;
