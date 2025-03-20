-- Create extension for UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  default_resume_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding sessions table
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  temporary_session_id TEXT,
  onboarding_session_id UUID REFERENCES onboarding_sessions(id)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  temporary_session_id TEXT,
  onboarding_session_id UUID REFERENCES onboarding_sessions(id)
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
  error_message TEXT,
  temporary_session_id UUID,
  onboarding_session_id UUID REFERENCES onboarding_sessions(id)
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

-- Indexes for onboarding
CREATE INDEX idx_onboarding_sessions_session_id ON onboarding_sessions(session_id);
CREATE INDEX idx_onboarding_sessions_expires_at ON onboarding_sessions(expires_at);
CREATE INDEX idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX idx_resumes_onboarding_session_id ON resumes(onboarding_session_id);
CREATE INDEX idx_jobs_onboarding_session_id ON jobs(onboarding_session_id);
CREATE INDEX idx_job_scans_onboarding_session_id ON job_scans(onboarding_session_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view their own profile" 
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view their own credit purchases" 
  ON credit_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit usage" 
  ON credit_usage FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for onboarding sessions
CREATE POLICY "Only system can create onboarding sessions" 
  ON onboarding_sessions FOR INSERT TO authenticated;

CREATE POLICY "Users can view their own onboarding sessions" 
  ON onboarding_sessions FOR SELECT USING (
    email = auth.email() OR 
    session_id = current_setting('app.temporary_session_id', true)
  );

-- New RLS policies that consider both regular users and onboarding sessions
CREATE POLICY "Users can view their own resumes" 
  ON resumes FOR SELECT USING (
    auth.uid() = user_id OR 
    onboarding_session_id IN (
      SELECT id FROM onboarding_sessions 
      WHERE session_id = current_setting('app.temporary_session_id', true)
    )
  );

CREATE POLICY "Users can view their own jobs" 
  ON jobs FOR SELECT USING (
    auth.uid() = user_id OR 
    onboarding_session_id IN (
      SELECT id FROM onboarding_sessions 
      WHERE session_id = current_setting('app.temporary_session_id', true)
    )
  );

CREATE POLICY "Users can view their own job scans" 
  ON job_scans FOR SELECT USING (
    auth.uid() = user_id OR 
    onboarding_session_id IN (
      SELECT id FROM onboarding_sessions 
      WHERE session_id = current_setting('app.temporary_session_id', true)
    )
  );

-- Add insert policies for onboarding
CREATE POLICY "Allow inserts to resumes during onboarding" 
  ON resumes FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    onboarding_session_id IN (
      SELECT id FROM onboarding_sessions 
      WHERE session_id = current_setting('app.temporary_session_id', true)
        AND status = 'active'
        AND expires_at > NOW()
    )
  );

CREATE POLICY "Allow inserts to jobs during onboarding" 
  ON jobs FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    onboarding_session_id IN (
      SELECT id FROM onboarding_sessions 
      WHERE session_id = current_setting('app.temporary_session_id', true)
        AND status = 'active'
        AND expires_at > NOW()
    )
  );

CREATE POLICY "Allow inserts to job_scans during onboarding" 
  ON job_scans FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    onboarding_session_id IN (
      SELECT id FROM onboarding_sessions 
      WHERE session_id = current_setting('app.temporary_session_id', true)
        AND status = 'active'
        AND expires_at > NOW()
    )
  );

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

-- Function to create an onboarding session
CREATE OR REPLACE FUNCTION create_onboarding_session(
  p_email TEXT DEFAULT NULL,
  p_expiry_hours INTEGER DEFAULT 24
)
RETURNS JSONB AS $$
DECLARE
  v_session_id TEXT;
  v_onboarding_id UUID;
BEGIN
  -- Generate a secure random session ID
  v_session_id := encode(gen_random_bytes(32), 'hex');
  
  -- Create the onboarding session
  INSERT INTO onboarding_sessions (
    session_id,
    email,
    status,
    expires_at
  )
  VALUES (
    v_session_id,
    p_email,
    'active',
    NOW() + (p_expiry_hours * INTERVAL '1 hour')
  )
  RETURNING id INTO v_onboarding_id;
  
  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'onboarding_id', v_onboarding_id,
    'expires_at', (NOW() + (p_expiry_hours * INTERVAL '1 hour'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate an onboarding session
CREATE OR REPLACE FUNCTION validate_onboarding_session(
  p_session_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_session_record onboarding_sessions%ROWTYPE;
BEGIN
  -- Find the session
  SELECT * INTO v_session_record
  FROM onboarding_sessions
  WHERE session_id = p_session_id
    AND status = 'active'
    AND expires_at > NOW();
  
  -- If session not found or expired
  IF v_session_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Invalid or expired session'
    );
  END IF;
  
  -- Session is valid
  RETURN jsonb_build_object(
    'valid', true,
    'onboarding_id', v_session_record.id,
    'email', v_session_record.email,
    'expires_at', v_session_record.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete onboarding and associate with a user account
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_session_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_onboarding_id UUID;
  v_email TEXT;
BEGIN
  -- Get the onboarding session ID
  SELECT id, email INTO v_onboarding_id, v_email
  FROM onboarding_sessions
  WHERE session_id = p_session_id
    AND status = 'active'
    AND expires_at > NOW();
  
  -- If session not found or expired
  IF v_onboarding_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or expired session'
    );
  END IF;
  
  -- Update the user email if needed and exists in the onboarding session
  IF v_email IS NOT NULL THEN
    UPDATE users
    SET email = v_email
    WHERE id = p_user_id
      AND (email IS NULL OR email = '');
  END IF;
  
  -- Update all resumes created during onboarding to belong to the user
  UPDATE resumes
  SET user_id = p_user_id,
      onboarding_session_id = NULL
  WHERE onboarding_session_id = v_onboarding_id;
  
  -- Update all jobs created during onboarding to belong to the user
  UPDATE jobs
  SET user_id = p_user_id,
      onboarding_session_id = NULL
  WHERE onboarding_session_id = v_onboarding_id;
  
  -- Update all job scans created during onboarding to belong to the user
  UPDATE job_scans
  SET user_id = p_user_id,
      onboarding_session_id = NULL
  WHERE onboarding_session_id = v_onboarding_id;
  
  -- Mark the onboarding session as completed
  UPDATE onboarding_sessions
  SET status = 'completed'
  WHERE id = v_onboarding_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Onboarding completed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically expire onboarding sessions
CREATE OR REPLACE FUNCTION expire_onboarding_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE onboarding_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= NOW();
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
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

CREATE TRIGGER update_onboarding_sessions_updated_at
BEFORE UPDATE ON onboarding_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();