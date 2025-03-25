-- Job Management System
-- This migration adds job tables, functions and policies

-- Jobs table with additional fields for AI processing
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title TEXT,
  company TEXT,
  location TEXT,
  description TEXT,
  
  -- Additional structured fields for AI extraction
  job_type TEXT,                    -- Full-time, Part-time, Contract, etc.
  salary_range_min INTEGER,         -- Minimum salary amount
  salary_range_max INTEGER,         -- Maximum salary amount
  salary_currency TEXT,             -- USD, EUR, etc.
  salary_period TEXT,               -- yearly, monthly, hourly
  
  requirements JSONB,               -- Array of requirement strings
  benefits JSONB,                   -- Array of benefit strings
  
  -- AI processing metadata
  raw_job_text TEXT,                -- Original pasted job description
  ai_confidence JSONB,              -- Confidence scores for each extracted field
  ai_version TEXT,                  -- Version of AI model used for extraction
  ai_processed_at TIMESTAMP WITH TIME ZONE, -- When AI processing occurred
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs updated_at trigger
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for jobs
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_job_type ON jobs(job_type);
CREATE INDEX idx_jobs_ai_processed_at ON jobs(ai_processed_at);

-- Enable Row Level Security on jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies remain the same
CREATE POLICY "Users can view their own jobs" 
  ON jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" 
  ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
  ON jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
  ON jobs FOR DELETE USING (auth.uid() = user_id);

-- Updated function to create a job with support for AI processing
CREATE OR REPLACE FUNCTION create_job(
  p_company TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_job_type TEXT DEFAULT NULL,
  p_salary_range_min INTEGER DEFAULT NULL,
  p_salary_range_max INTEGER DEFAULT NULL,
  p_salary_currency TEXT DEFAULT NULL,
  p_salary_period TEXT DEFAULT NULL,
  p_requirements JSONB DEFAULT NULL,
  p_benefits JSONB DEFAULT NULL,
  p_raw_job_text TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_job_id UUID;
  v_user_id UUID;
  v_user_exists BOOLEAN;
  v_ai_data JSONB;
  v_ai_confidence JSONB;
  v_ai_version TEXT := '1.0';
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if user exists in the users table
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_user_id
  ) INTO v_user_exists;
  
  -- If user doesn't exist yet in the users table, create it
  IF NOT v_user_exists THEN
    INSERT INTO public.users (
      id,
      email,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      (SELECT email FROM auth.users WHERE id = v_user_id),
      NOW(),
      NOW()
    );
    
    -- Also create initial credits if not present
    IF NOT EXISTS (SELECT 1 FROM public.credit_purchases WHERE user_id = v_user_id) THEN
      INSERT INTO public.credit_purchases (
        user_id,
        credit_amount,
        remaining_credits,
        purchase_date
      ) VALUES (
        v_user_id,
        10, -- 10 free credits
        10, -- all credits initially available
        NOW()
      );
    END IF;
  END IF;
  
  -- Process with AI if we have raw text but missing structured data
  IF p_raw_job_text IS NOT NULL AND 
     (p_title IS NULL OR p_company IS NULL OR p_description IS NULL) THEN
    
    -- This would call your AI service in a real implementation
    -- For now we'll create placeholder confidence scores
    v_ai_confidence := jsonb_build_object(
      'title', 0.9,
      'company', 0.8,
      'location', 0.7,
      'job_type', 0.8,
      'salary', 0.6,
      'description', 0.9,
      'requirements', 0.7,
      'benefits', 0.6
    );
    
    -- Note: In a real implementation, these fields would be extracted by AI
    -- This is just a placeholder
  END IF;
  
  -- Insert the job record
  INSERT INTO jobs (
    user_id,
    company,
    title,
    location,
    description,
    job_type,
    salary_range_min,
    salary_range_max,
    salary_currency,
    salary_period,
    requirements,
    benefits,
    raw_job_text,
    ai_confidence,
    ai_version,
    ai_processed_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_company,
    p_title,
    p_location,
    p_description,
    p_job_type,
    p_salary_range_min,
    p_salary_range_max,
    p_salary_currency,
    p_salary_period,
    p_requirements,
    p_benefits,
    p_raw_job_text,
    CASE WHEN p_raw_job_text IS NOT NULL THEN v_ai_confidence ELSE NULL END,
    CASE WHEN p_raw_job_text IS NOT NULL THEN v_ai_version ELSE NULL END,
    CASE WHEN p_raw_job_text IS NOT NULL THEN NOW() ELSE NULL END,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_job_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'ai_processed', p_raw_job_text IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;