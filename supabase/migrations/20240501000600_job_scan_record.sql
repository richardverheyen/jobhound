-- Job Scan System
-- This migration adds job scan table, functions and policies

-- Job scans table
CREATE TABLE IF NOT EXISTS job_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  resume_id UUID REFERENCES resumes(id) NOT NULL,
  credit_purchase_id UUID REFERENCES credit_purchases(id),
  resume_filename TEXT,
  job_posting TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT,
  results JSONB,
  match_score FLOAT8,
  error_message TEXT,
  overall_match TEXT,
  hard_skills TEXT,
  soft_skills TEXT,
  experience_match TEXT,
  qualifications TEXT,
  missing_keywords TEXT,
  category_scores JSONB DEFAULT jsonb_build_object(
    'searchability', 0,
    'hardSkills', 0,
    'softSkills', 0, 
    'recruiterTips', 0,
    'formatting', 0
  ),
  category_feedback JSONB DEFAULT jsonb_build_object(
    'searchability', jsonb_build_array(),
    'contactInfo', jsonb_build_array(),
    'summary', jsonb_build_array(),
    'sectionHeadings', jsonb_build_array(),
    'jobTitleMatch', jsonb_build_array(),
    'dateFormatting', jsonb_build_array()
  )
);

-- Create indexes for job_scans
CREATE INDEX idx_job_scans_user_id ON job_scans(user_id);
CREATE INDEX idx_job_scans_job_id ON job_scans(job_id);
CREATE INDEX idx_job_scans_resume_id ON job_scans(resume_id);
CREATE INDEX idx_job_scans_credit_purchase_id ON job_scans(credit_purchase_id);
CREATE INDEX idx_job_scans_match_score ON job_scans(match_score);
CREATE INDEX idx_job_scans_status ON job_scans(status);

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