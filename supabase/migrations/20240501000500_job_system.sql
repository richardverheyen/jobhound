-- Job Management System
-- This migration adds job tables, functions and policies

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title TEXT,
  company TEXT,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs updated_at trigger
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for jobs
CREATE INDEX idx_jobs_user_id ON jobs(user_id);

-- Enable Row Level Security on jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create job RLS policies
CREATE POLICY "Users can view their own jobs" 
  ON jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" 
  ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
  ON jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
  ON jobs FOR DELETE USING (auth.uid() = user_id);

-- Create function to create a job
CREATE OR REPLACE FUNCTION create_job(
  p_company TEXT,
  p_title TEXT,
  p_location TEXT,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_job_id UUID;
  v_user_id UUID;
  v_user_exists BOOLEAN;
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
  
  -- Insert the job record
  INSERT INTO jobs (
    user_id,
    company,
    title,
    location,
    description,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_company,
    p_title,
    p_location,
    p_description,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_job_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 