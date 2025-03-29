-- Job Scan System
-- This migration adds job scan table, functions and policies

-- Job scans table
CREATE TABLE IF NOT EXISTS job_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  resume_id UUID REFERENCES resumes(id) NOT NULL,
  credit_purchase_id UUID REFERENCES credit_purchases(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  match_score FLOAT,
  results JSONB,
  overall_match TEXT,
  hard_skills TEXT,
  soft_skills TEXT,
  experience_match TEXT,
  qualifications TEXT,
  missing_keywords TEXT,
  category_scores JSONB,
  category_feedback JSONB
);

-- Create indexes for job_scans
CREATE INDEX idx_job_scans_user_id ON job_scans(user_id);
CREATE INDEX idx_job_scans_job_id ON job_scans(job_id);
CREATE INDEX idx_job_scans_resume_id ON job_scans(resume_id);

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