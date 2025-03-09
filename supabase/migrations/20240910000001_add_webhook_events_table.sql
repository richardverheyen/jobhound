-- Create webhook_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  stripe_event_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view webhook events
DROP POLICY IF EXISTS "Admins can view webhook events";
CREATE POLICY "Admins can view webhook events"
  ON webhook_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM users WHERE subscription = 'admin'));

-- Add realtime
alter publication supabase_realtime add table webhook_events;
