-- Run this migration ONCE to update existing database
-- This adds the new columns and updates the password for the admin user

-- Add new columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Migrate existing password to password_hash (for admin user with password 'admin123')
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4zL3I7UXJZQY.mXG'
WHERE username = 'admin' AND (password_hash IS NULL OR password_hash = '');

-- Drop old password column if it exists (optional, run after confirming migration works)
-- ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Verify migration
SELECT id, username, name, 
       CASE WHEN password_hash IS NOT NULL THEN 'YES' ELSE 'NO' END as has_hash
FROM users;
