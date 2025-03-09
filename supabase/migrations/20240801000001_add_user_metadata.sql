-- Add metadata column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'metadata') THEN
    ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add credit_history table to track all credit changes
CREATE TABLE IF NOT EXISTS credit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  previous_credits INTEGER NOT NULL,
  new_credits INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  source VARCHAR(255) NOT NULL,
  reference_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on credit_history
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

-- Create policy for credit_history
DROP POLICY IF EXISTS "Users can view their own credit history" ON credit_history;
CREATE POLICY "Users can view their own credit history"
  ON credit_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to track credit changes
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

-- Create trigger for credit changes
DROP TRIGGER IF EXISTS track_user_credit_changes ON users;
CREATE TRIGGER track_user_credit_changes
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION track_credit_changes();

-- Add realtime for credit_history
alter publication supabase_realtime add table credit_history;
