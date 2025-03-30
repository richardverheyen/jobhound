-- Job Scan System
-- This migration adds job scan table, functions and policies

-- Job scans table
CREATE TABLE IF NOT EXISTS job_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  resume_id UUID REFERENCES resumes(id) NOT NULL,
  resume_filename TEXT,
  credit_purchase_id UUID REFERENCES credit_purchases(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  results JSONB,
  match_score INTEGER
);

-- Create indexes for job_scans
CREATE INDEX idx_job_scans_user_id ON job_scans(user_id);
CREATE INDEX idx_job_scans_job_id ON job_scans(job_id);
CREATE INDEX idx_job_scans_resume_id ON job_scans(resume_id);
CREATE INDEX idx_job_scans_match_score ON job_scans(match_score);

-- Add comment to explain the match_score column
COMMENT ON COLUMN job_scans.match_score IS 'Score representing how well the resume matches the job requirements (0-100)';

-- Enable Row Level Security on job_scans
ALTER TABLE job_scans ENABLE ROW LEVEL SECURITY;

-- Create job_scans RLS policies
CREATE POLICY "Users can view their own job scans" 
  ON job_scans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job scans" 
  ON job_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job scans"
  ON job_scans
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 