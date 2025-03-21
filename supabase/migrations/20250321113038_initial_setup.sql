-- Create extension for UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  default_resume_id UUID,
  is_anonymous BOOLEAN DEFAULT FALSE,
  anonymous_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit purchases table
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  credit_amount INTEGER NOT NULL,
  remaining_credits INTEGER NOT NULL,
  stripe_session_id TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit usage table
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES credit_purchases(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  scan_id UUID,
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  file_size INT8,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create indexes for better performance
CREATE INDEX idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX idx_credit_purchases_expires_at ON credit_purchases(expires_at);
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_purchase_id ON credit_usage(purchase_id);
CREATE INDEX idx_credit_usage_scan_id ON credit_usage(scan_id);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at);

-- Indexes for resume-related tables
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_users_default_resume_id ON users(default_resume_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_job_scans_user_id ON job_scans(user_id);
CREATE INDEX idx_job_scans_job_id ON job_scans(job_id);
CREATE INDEX idx_job_scans_resume_id ON job_scans(resume_id);
CREATE INDEX idx_job_scans_credit_purchase_id ON job_scans(credit_purchase_id);
CREATE INDEX idx_job_scans_match_score ON job_scans(match_score);
CREATE INDEX idx_job_scans_status ON job_scans(status);

-- Indexes for anonymous users
CREATE INDEX idx_users_is_anonymous ON users(is_anonymous);
CREATE INDEX idx_users_anonymous_expires_at ON users(anonymous_expires_at);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_scans ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view their own profile" 
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own credit purchases" 
  ON credit_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit usage" 
  ON credit_usage FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for resumes
CREATE POLICY "Users can view their own resumes" 
  ON resumes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes" 
  ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes" 
  ON resumes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes" 
  ON resumes FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for jobs
CREATE POLICY "Users can view their own jobs" 
  ON jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" 
  ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
  ON jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
  ON jobs FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for job scans
CREATE POLICY "Users can view their own job scans" 
  ON job_scans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job scans" 
  ON job_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job scans" 
  ON job_scans FOR UPDATE USING (auth.uid() = user_id);

-- Create helpful functions
CREATE OR REPLACE FUNCTION get_available_credits(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(remaining_credits), 0)::INTEGER
  FROM credit_purchases
  WHERE user_id = p_user_id
  AND (expires_at IS NULL OR expires_at > NOW());
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to create a job scan and use a credit
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
    request_payload,
    created_at
  )
  VALUES (
    v_purchase_id,
    p_user_id,
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

-- Keep the original use_credit function for non-scan related credit usage
CREATE OR REPLACE FUNCTION use_credit(
  p_user_id UUID,
  p_request_payload JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_usage_id UUID;
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
  
  -- Record the usage
  INSERT INTO credit_usage (
    purchase_id,
    user_id,
    request_payload,
    created_at
  )
  VALUES (
    v_purchase_id,
    p_user_id,
    p_request_payload,
    NOW()
  )
  RETURNING id INTO v_usage_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'purchase_id', v_purchase_id, 
    'usage_id', v_usage_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set default resume for a user
CREATE OR REPLACE FUNCTION set_default_resume(p_user_id UUID, p_resume_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_resume_exists BOOLEAN;
BEGIN
  -- Check if resume exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM resumes 
    WHERE id = p_resume_id AND user_id = p_user_id
  ) INTO v_resume_exists;
  
  -- If resume not found or doesn't belong to user
  IF NOT v_resume_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Update the user's default resume
  UPDATE users
  SET default_resume_id = p_resume_id
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create an anonymous user account
CREATE OR REPLACE FUNCTION create_anonymous_user(
  p_expiry_hours INTEGER DEFAULT 24
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create a record in the users table for the anonymous user
  INSERT INTO users (
    id,
    is_anonymous,
    anonymous_expires_at
  )
  VALUES (
    auth.uid(),
    TRUE,
    NOW() + (p_expiry_hours * INTERVAL '1 hour')
  )
  RETURNING id INTO v_user_id;
  
  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'expires_at', (NOW() + (p_expiry_hours * INTERVAL '1 hour'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert an anonymous user to a registered user
CREATE OR REPLACE FUNCTION convert_anonymous_user(
  p_user_id UUID,
  p_email TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- Check if the user exists and is anonymous
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND is_anonymous = TRUE
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'User not found or not an anonymous user'
    );
  END IF;
  
  -- Update the user to be a registered user
  UPDATE users
  SET is_anonymous = FALSE,
      anonymous_expires_at = NULL,
      email = p_email,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Anonymous user converted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired anonymous users
CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_users()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Get the count of expired anonymous users
  SELECT COUNT(*) INTO v_count
  FROM users
  WHERE is_anonymous = TRUE
  AND anonymous_expires_at <= NOW();
  
  -- Delete all related data for expired anonymous users
  -- Use a CTE to properly handle dependencies
  WITH expired_users AS (
    SELECT id FROM users
    WHERE is_anonymous = TRUE
    AND anonymous_expires_at <= NOW()
  )
  -- Delete job scans first (has foreign keys to jobs and resumes)
  DELETE FROM job_scans
  WHERE user_id IN (SELECT id FROM expired_users);
  
  -- Then delete jobs
  DELETE FROM jobs
  WHERE user_id IN (SELECT id FROM expired_users);
  
  -- Then delete resumes
  DELETE FROM resumes
  WHERE user_id IN (SELECT id FROM expired_users);
  
  -- Finally delete the user records
  DELETE FROM users
  WHERE id IN (SELECT id FROM expired_users);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for the updated_at columns
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at
BEFORE UPDATE ON resumes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a storage bucket for resumes
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('resumes', 'resumes', false, false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Set up RLS for the resumes bucket
-- Policy to allow users to insert their own resumes
CREATE POLICY "Users can upload their own resumes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to select their own resumes
CREATE POLICY "Users can view their own resumes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to update their own resumes
CREATE POLICY "Users can update their own resumes"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to delete their own resumes
CREATE POLICY "Users can delete their own resumes"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a helper function to generate a storage path for new resume uploads
CREATE OR REPLACE FUNCTION generate_resume_storage_path(
  p_user_id UUID,
  p_filename TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_safe_filename TEXT;
  v_timestamp TEXT;
BEGIN
  -- Generate timestamp for unique filenames
  v_timestamp := to_char(now(), 'YYYYMMDD_HH24MISS');
  
  -- Make filename safe by removing problematic characters
  v_safe_filename := regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');
  
  -- Return the full path using the user ID as the folder
  RETURN p_user_id::text || '/' || v_timestamp || '_' || v_safe_filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to register a resume upload
CREATE OR REPLACE FUNCTION register_resume_upload(
  p_user_id UUID,
  p_filename TEXT,
  p_file_path TEXT,
  p_file_size INT8,
  p_mime_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_resume_id UUID;
  v_storage_url TEXT;
BEGIN
  -- Get the Supabase project URL for constructing the public URL
  BEGIN
    v_storage_url := 'https://' || current_setting('supabase_functions.project_ref') || '.supabase.co/storage/v1/object/public/resumes/';
  EXCEPTION WHEN OTHERS THEN
    -- Fallback for development environments where the setting might not be available
    v_storage_url := '/storage/v1/object/public/resumes/';
  END;
  
  -- Insert the resume record
  INSERT INTO resumes (
    user_id,
    filename,
    file_path,
    file_url,
    file_size,
    mime_type
  )
  VALUES (
    p_user_id,
    p_filename,
    p_file_path,
    v_storage_url || p_file_path,
    p_file_size,
    p_mime_type
  )
  RETURNING id INTO v_resume_id;
  
  -- If this is the user's first resume, set it as default
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id AND default_resume_id IS NOT NULL
  ) THEN
    UPDATE users SET default_resume_id = v_resume_id WHERE id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'resume_id', v_resume_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;