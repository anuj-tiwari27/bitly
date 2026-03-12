-- Add moderator role for existing databases (run manually if needed)
-- Safe to run: uses ON CONFLICT to skip if role already exists
--
-- PowerShell: Get-Content infrastructure/postgres/migrations/001_add_moderator_role.sql | docker exec -i bitly-postgres psql -U bitly -d bitly
-- Bash: docker exec -i bitly-postgres psql -U bitly -d bitly < infrastructure/postgres/migrations/001_add_moderator_role.sql
INSERT INTO roles (name, description, permissions) VALUES
    ('moderator', 'Can moderate content and manage users', '["users:read", "links:read", "links:write", "analytics:read"]')
ON CONFLICT (name) DO NOTHING;
