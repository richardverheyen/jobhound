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
  error_message TEXT
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

-- Create function to create a job scan and use a credit
CREATE OR REPLACE FUNCTION create_job_scan(
  p_user_id UUID,
  p_job_id UUID,
  p_resume_id UUID,
  p_resume_filename TEXT DEFAULT NULL,
  p_job_posting TEXT DEFAULT NULL,
  p_request_payload JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_scan_id UUID;
BEGIN
  -- Find the oldest purchase with available credits
  SELECT id INTO v_purchase_id
  FROM credit_purchases
  WHERE user_id = p_user_id
  AND remaining_credits > 0
  AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY COALESCE(expires_at, 'infinity'::timestamptz) ASC, created_at ASC
  LIMIT 1
  FOR UPDATE;
  
  -- If no purchase with available credits found
  IF v_purchase_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient credits');
  END IF;
  
  -- Decrement the credit
  UPDATE credit_purchases
  SET remaining_credits = remaining_credits - 1
  WHERE id = v_purchase_id;
  
  -- Create the job scan record with credit purchase reference
  INSERT INTO job_scans (
    user_id,
    job_id,
    resume_id,
    credit_purchase_id,
    resume_filename,
    job_posting,
    status,
    created_at
  )
  VALUES (
    p_user_id,
    p_job_id,
    p_resume_id,
    v_purchase_id,
    COALESCE(p_resume_filename, (SELECT filename FROM resumes WHERE id = p_resume_id)),
    p_job_posting,
    'pending',
    NOW()
  )
  RETURNING id INTO v_scan_id;
  
  -- Also record in credit_usage for backward compatibility
  INSERT INTO credit_usage (
    purchase_id,
    user_id,
    scan_id,
    request_payload,
    created_at
  )
  VALUES (
    v_purchase_id,
    p_user_id,
    v_scan_id,
    p_request_payload,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'purchase_id', v_purchase_id, 
    'scan_id', v_scan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improved function to create a scan (added for compatibility)
CREATE OR REPLACE FUNCTION create_scan(
  p_user_id UUID,
  p_job_id UUID,
  p_resume_id UUID,
  p_resume_filename TEXT,
  p_job_posting TEXT
) RETURNS UUID AS $$
DECLARE
  v_result JSONB;
  v_scan_id UUID;
BEGIN
  v_result := create_job_scan(
    p_user_id,
    p_job_id,
    p_resume_id,
    p_resume_filename,
    p_job_posting
  );
  
  IF (v_result->>'success')::BOOLEAN THEN
    v_scan_id := (v_result->>'scan_id')::UUID;
    RETURN v_scan_id;
  ELSE
    RAISE EXCEPTION 'Failed to create scan: %', v_result->>'message';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 