-- Add device fingerprint to users table for tracking anonymous users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Create index on device_fingerprint
CREATE INDEX IF NOT EXISTS idx_users_device_fingerprint ON users(device_fingerprint);

-- Create index on auth_id
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id); 