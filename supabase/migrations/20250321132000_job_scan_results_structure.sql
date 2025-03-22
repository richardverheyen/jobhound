-- Migration to enhance job_scans table with structured ATS analysis results
-- This migration adds JSONB columns for detailed aspects of scan results

-- Add specific columns for structured analysis data
ALTER TABLE job_scans 
ADD COLUMN IF NOT EXISTS overall_match TEXT,
ADD COLUMN IF NOT EXISTS hard_skills TEXT,
ADD COLUMN IF NOT EXISTS soft_skills TEXT,
ADD COLUMN IF NOT EXISTS experience_match TEXT,
ADD COLUMN IF NOT EXISTS qualifications TEXT,
ADD COLUMN IF NOT EXISTS missing_keywords TEXT,
ADD COLUMN IF NOT EXISTS match_score FLOAT CHECK (match_score >= 0 AND match_score <= 100);

-- Add category scores
ALTER TABLE job_scans
ADD COLUMN IF NOT EXISTS category_scores JSONB DEFAULT jsonb_build_object(
  'searchability', 0,
  'hardSkills', 0,
  'softSkills', 0, 
  'recruiterTips', 0,
  'formatting', 0
);

-- Add category feedback
ALTER TABLE job_scans
ADD COLUMN IF NOT EXISTS category_feedback JSONB DEFAULT jsonb_build_object(
  'searchability', jsonb_build_array(),
  'contactInfo', jsonb_build_array(),
  'summary', jsonb_build_array(),
  'sectionHeadings', jsonb_build_array(),
  'jobTitleMatch', jsonb_build_array(),
  'dateFormatting', jsonb_build_array()
);

-- Create a function to handle scan analysis results
CREATE OR REPLACE FUNCTION update_scan_results() 
RETURNS TRIGGER AS $$
BEGIN
  -- Extract data from the results JSONB into dedicated columns for better querying
  IF NEW.results IS NOT NULL THEN
    NEW.overall_match := NEW.results->>'overallMatch';
    NEW.hard_skills := NEW.results->>'hardSkills';
    NEW.soft_skills := NEW.results->>'softSkills';
    NEW.experience_match := NEW.results->>'experienceMatch';
    NEW.qualifications := NEW.results->>'qualifications';
    NEW.missing_keywords := NEW.results->>'missingKeywords';
    NEW.match_score := (NEW.results->>'matchScore')::float;
    NEW.category_scores := NEW.results->'categoryScores';
    NEW.category_feedback := NEW.results->'categoryFeedback';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that automatically updates the structured columns
DROP TRIGGER IF EXISTS scan_results_trigger ON job_scans;
CREATE TRIGGER scan_results_trigger
BEFORE INSERT OR UPDATE ON job_scans
FOR EACH ROW
EXECUTE FUNCTION update_scan_results();

-- Update function to create a scan record that also handles credit usage
CREATE OR REPLACE FUNCTION create_scan(
  p_user_id UUID,
  p_job_id UUID,
  p_resume_id UUID,
  p_resume_filename TEXT,
  p_job_posting TEXT
) RETURNS UUID AS $$
DECLARE
  v_scan_id UUID;
  v_purchase_id UUID;
BEGIN
  -- Find a credit purchase with remaining credits
  SELECT id INTO v_purchase_id
  FROM credit_purchases
  WHERE user_id = p_user_id
    AND remaining_credits > 0
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY expires_at ASC NULLS LAST
  LIMIT 1;
  
  -- Check if user has credits
  IF v_purchase_id IS NULL THEN
    RAISE EXCEPTION 'No credits available for user';
  END IF;
  
  -- Generate a new scan ID
  SELECT gen_random_uuid() INTO v_scan_id;
  
  -- Create the scan record
  INSERT INTO job_scans (
    id, 
    user_id, 
    job_id, 
    resume_id, 
    credit_purchase_id,
    resume_filename,
    job_posting,
    status,
    created_at
  ) VALUES (
    v_scan_id,
    p_user_id,
    p_job_id,
    p_resume_id,
    v_purchase_id,
    p_resume_filename,
    p_job_posting,
    'processing',
    NOW()
  );
  
  -- Decrement credits from the purchase
  UPDATE credit_purchases
  SET remaining_credits = remaining_credits - 1
  WHERE id = v_purchase_id;
  
  -- Record credit usage
  INSERT INTO credit_usage (
    id,
    purchase_id,
    user_id,
    scan_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_purchase_id,
    p_user_id,
    v_scan_id,
    NOW()
  );
  
  RETURN v_scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 