-- Job Scan Results Structure
-- This migration enhances the job_scans table with structured results and analysis capabilities

-- Add specific columns for structured analysis data
ALTER TABLE job_scans 
ADD COLUMN IF NOT EXISTS overall_match TEXT,
ADD COLUMN IF NOT EXISTS hard_skills TEXT,
ADD COLUMN IF NOT EXISTS soft_skills TEXT,
ADD COLUMN IF NOT EXISTS experience_match TEXT,
ADD COLUMN IF NOT EXISTS qualifications TEXT,
ADD COLUMN IF NOT EXISTS missing_keywords TEXT;

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