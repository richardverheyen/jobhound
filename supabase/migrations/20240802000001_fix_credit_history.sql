-- This migration fixes any issues with the credit_history table

-- Ensure credit_history table exists
CREATE TABLE IF NOT EXISTS credit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  previous_credits INTEGER NOT NULL,
  new_credits INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  source VARCHAR(255) NOT NULL,
  reference_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add foreign key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'credit_history_user_id_fkey'
  ) THEN
    ALTER TABLE credit_history ADD CONSTRAINT credit_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

-- Create policy if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_history' AND policyname = 'Users can view their own credit history'
  ) THEN
    CREATE POLICY "Users can view their own credit history"
      ON credit_history
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure function exists
CREATE OR REPLACE FUNCTION track_credit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credits IS DISTINCT FROM NEW.credits THEN
    INSERT INTO credit_history (user_id, previous_credits, new_credits, change_amount, source, reference_id, metadata)
    VALUES (
      NEW.id,
      COALESCE(OLD.credits::INTEGER, 0),
      COALESCE(NEW.credits::INTEGER, 0),
      COALESCE(NEW.credits::INTEGER, 0) - COALESCE(OLD.credits::INTEGER, 0),
      COALESCE((NEW.metadata->>'last_credit_source')::VARCHAR, 'unknown'),
      NULL,
      NEW.metadata
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'track_user_credit_changes'
  ) THEN
    CREATE TRIGGER track_user_credit_changes
      AFTER UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION track_credit_changes();
  END IF;
END $$;

-- Add to realtime publication if not already added
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'credit_history'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE credit_history;
  END IF;
END $$;
