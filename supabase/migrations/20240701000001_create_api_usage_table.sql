-- Create api_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scan_id UUID
);

-- Add table to publication if not already added
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = current_schema()
    AND tablename = 'api_usage'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE api_usage';
  END IF;
END $$;

-- Add credits column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE users ADD COLUMN credits TEXT DEFAULT '5';
  END IF;
END $$;
