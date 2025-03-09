-- Add metadata column to users table if it doesn't exist
DO $ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'metadata') THEN
    ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $;

-- Create credit_history table only if it doesn't exist
DO $ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_history') THEN
    CREATE TABLE credit_history (
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

    -- Add foreign key constraint if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
      ALTER TABLE credit_history ADD CONSTRAINT credit_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;

    -- Enable RLS on credit_history
    ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

    -- Create policy for credit_history
    CREATE POLICY "Users can view their own credit history"
      ON credit_history
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    -- Add realtime for credit_history
    ALTER publication supabase_realtime ADD TABLE credit_history;
  END IF;
END $;

-- Create function to track credit changes if it doesn't exist
DO $ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'track_credit_changes') THEN
    CREATE FUNCTION track_credit_changes()
    RETURNS TRIGGER AS $
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
    $ LANGUAGE plpgsql;
  END IF;
END $;

-- Create trigger for credit changes if it doesn't exist
DO $ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'track_user_credit_changes') THEN
    CREATE TRIGGER track_user_credit_changes
      AFTER UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION track_credit_changes();
  END IF;
END $;
