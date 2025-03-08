-- Create job_scans table to store scan history
CREATE TABLE IF NOT EXISTS job_scans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  job_posting TEXT NOT NULL,
  resume_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  results JSONB,
  match_score INTEGER,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE job_scans ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view only their own scans
DROP POLICY IF EXISTS "Users can view their own scans" ON job_scans;
CREATE POLICY "Users can view their own scans"
  ON job_scans FOR SELECT
  USING (auth.uid() = user_id);

-- Add scan_id to api_usage table
ALTER TABLE api_usage ADD COLUMN IF NOT EXISTS scan_id UUID REFERENCES job_scans(id);

-- Enable realtime for job_scans
ALTER PUBLICATION supabase_realtime ADD TABLE job_scans;
