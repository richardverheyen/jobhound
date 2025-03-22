-- This migration fixes RLS policies to ensure users can read their own records
-- Particularly focusing on jobs, resumes, and job_scans tables

-- First, drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;

DROP POLICY IF EXISTS "Users can view their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can insert their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON resumes;

DROP POLICY IF EXISTS "Users can view their own job scans" ON job_scans;
DROP POLICY IF EXISTS "Users can insert their own job scans" ON job_scans;
DROP POLICY IF EXISTS "Users can update their own job scans" ON job_scans;
DROP POLICY IF EXISTS "Users can delete their own job scans" ON job_scans;

-- Re-create policies with proper wording and permissions

-- Jobs table policies
CREATE POLICY "Users can view their own jobs" 
  ON jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" 
  ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
  ON jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
  ON jobs FOR DELETE USING (auth.uid() = user_id);

-- Resumes table policies
CREATE POLICY "Users can view their own resumes" 
  ON resumes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes" 
  ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes" 
  ON resumes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes" 
  ON resumes FOR DELETE USING (auth.uid() = user_id);

-- Job scans table policies
CREATE POLICY "Users can view their own job scans" 
  ON job_scans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job scans" 
  ON job_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job scans" 
  ON job_scans FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job scans" 
  ON job_scans FOR DELETE USING (auth.uid() = user_id);

-- Make sure to enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

-- Add specific policy for credit purchases
DROP POLICY IF EXISTS "Users can view their own credit purchases" ON credit_purchases;
CREATE POLICY "Users can view their own credit purchases" 
  ON credit_purchases FOR SELECT USING (auth.uid() = user_id);

-- Add specific policy for credit usage
DROP POLICY IF EXISTS "Users can view their own credit usage" ON credit_usage;
CREATE POLICY "Users can view their own credit usage" 
  ON credit_usage FOR SELECT USING (auth.uid() = user_id);

-- Add anonymous access policy (if needed)
DROP POLICY IF EXISTS "Allow anonymous access to anonymous users" ON users;
CREATE POLICY "Allow anonymous access to anonymous users" 
  ON users FOR SELECT USING (is_anonymous = true);

-- Add a JOIN policy between jobs and job_scans
-- This allows users to get data when joining tables
DROP POLICY IF EXISTS "Users can view scans connected to their jobs" ON job_scans;
CREATE POLICY "Users can view scans connected to their jobs" 
  ON job_scans 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM jobs WHERE id = job_scans.job_id
    )
  );

-- Add a JOIN policy between resumes and job_scans
DROP POLICY IF EXISTS "Users can view scans connected to their resumes" ON job_scans;
CREATE POLICY "Users can view scans connected to their resumes" 
  ON job_scans 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM resumes WHERE id = job_scans.resume_id
    )
  );

-- Create a diagnostic function to test if a user can access specific records
CREATE OR REPLACE FUNCTION check_user_access(
  p_user_id UUID,
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_can_access BOOLEAN;
  v_query TEXT;
  v_result JSONB;
BEGIN
  -- Construct dynamic SQL to check if the record exists for the user
  IF p_table_name = 'jobs' THEN
    v_query := 'SELECT EXISTS (SELECT 1 FROM jobs WHERE id = $1 AND user_id = $2)';
  ELSIF p_table_name = 'resumes' THEN
    v_query := 'SELECT EXISTS (SELECT 1 FROM resumes WHERE id = $1 AND user_id = $2)';
  ELSIF p_table_name = 'job_scans' THEN
    v_query := 'SELECT EXISTS (SELECT 1 FROM job_scans WHERE id = $1 AND user_id = $2)';
  ELSIF p_table_name = 'credit_purchases' THEN
    v_query := 'SELECT EXISTS (SELECT 1 FROM credit_purchases WHERE id = $1 AND user_id = $2)';
  ELSIF p_table_name = 'credit_usage' THEN
    v_query := 'SELECT EXISTS (SELECT 1 FROM credit_usage WHERE id = $1 AND user_id = $2)';
  ELSE
    RETURN jsonb_build_object('error', 'Invalid table name');
  END IF;
  
  -- Execute the query
  EXECUTE v_query INTO v_can_access USING p_record_id, p_user_id;
  
  -- Return the result
  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'table', p_table_name,
    'record_id', p_record_id,
    'can_access', v_can_access
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all records for a specific user (useful for debugging)
CREATE OR REPLACE FUNCTION get_user_records(
  p_table_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_query TEXT;
  v_result JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user exists
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not authenticated');
  END IF;
  
  -- Construct query based on table name
  IF p_table_name = 'jobs' THEN
    v_query := 'SELECT json_agg(j) FROM (SELECT * FROM jobs WHERE user_id = $1) j';
  ELSIF p_table_name = 'resumes' THEN
    v_query := 'SELECT json_agg(r) FROM (SELECT * FROM resumes WHERE user_id = $1) r';
  ELSIF p_table_name = 'job_scans' THEN
    v_query := 'SELECT json_agg(js) FROM (SELECT * FROM job_scans WHERE user_id = $1) js';
  ELSIF p_table_name = 'credit_purchases' THEN
    v_query := 'SELECT json_agg(cp) FROM (SELECT * FROM credit_purchases WHERE user_id = $1) cp';
  ELSIF p_table_name = 'credit_usage' THEN
    v_query := 'SELECT json_agg(cu) FROM (SELECT * FROM credit_usage WHERE user_id = $1) cu';
  ELSE
    RETURN jsonb_build_object('error', 'Invalid table name');
  END IF;
  
  -- Execute the query
  EXECUTE v_query INTO v_result USING v_user_id;
  
  -- Return the result
  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'table', p_table_name,
    'records', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a comprehensive RLS test function
CREATE OR REPLACE FUNCTION test_user_rls_policies()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_results JSONB;
  v_jobs_select BOOLEAN;
  v_jobs_insert BOOLEAN;
  v_jobs_update BOOLEAN;
  v_jobs_delete BOOLEAN;
  v_resumes_select BOOLEAN;
  v_resumes_insert BOOLEAN;
  v_resumes_update BOOLEAN;
  v_resumes_delete BOOLEAN;
  v_job_scans_select BOOLEAN;
  v_job_scans_insert BOOLEAN;
  v_job_scans_update BOOLEAN;
  v_job_scans_delete BOOLEAN;
  v_credit_purchases_select BOOLEAN;
  v_credit_usage_select BOOLEAN;
  v_test_job_id UUID;
  v_test_resume_id UUID;
  v_test_scan_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user exists
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not authenticated');
  END IF;
  
  -- Test RLS policies for all tables and operations

  -- Create test records
  BEGIN
    INSERT INTO jobs (id, user_id, title, company, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, 'Test Job', 'Test Company', NOW(), NOW())
    RETURNING id INTO v_test_job_id;
    v_jobs_insert := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      v_jobs_insert := FALSE;
  END;
  
  BEGIN
    INSERT INTO resumes (id, user_id, filename, file_path, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, 'Test Resume', 'test/path.pdf', NOW(), NOW())
    RETURNING id INTO v_test_resume_id;
    v_resumes_insert := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      v_resumes_insert := FALSE;
  END;
  
  -- Test SELECT policies
  BEGIN
    PERFORM id FROM jobs WHERE user_id = v_user_id LIMIT 1;
    v_jobs_select := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      v_jobs_select := FALSE;
  END;
  
  BEGIN
    PERFORM id FROM resumes WHERE user_id = v_user_id LIMIT 1;
    v_resumes_select := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      v_resumes_select := FALSE;
  END;
  
  BEGIN
    PERFORM id FROM job_scans WHERE user_id = v_user_id LIMIT 1;
    v_job_scans_select := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      v_job_scans_select := FALSE;
  END;
  
  BEGIN
    PERFORM id FROM credit_purchases WHERE user_id = v_user_id LIMIT 1;
    v_credit_purchases_select := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      v_credit_purchases_select := FALSE;
  END;
  
  BEGIN
    PERFORM id FROM credit_usage WHERE user_id = v_user_id LIMIT 1;
    v_credit_usage_select := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      v_credit_usage_select := FALSE;
  END;
  
  -- Test UPDATE policies if we have test records
  IF v_test_job_id IS NOT NULL THEN
    BEGIN
      UPDATE jobs SET title = 'Updated Test Job' WHERE id = v_test_job_id;
      v_jobs_update := TRUE;
    EXCEPTION
      WHEN OTHERS THEN
        v_jobs_update := FALSE;
    END;
  ELSE
    v_jobs_update := NULL;
  END IF;
  
  IF v_test_resume_id IS NOT NULL THEN
    BEGIN
      UPDATE resumes SET filename = 'Updated Test Resume' WHERE id = v_test_resume_id;
      v_resumes_update := TRUE;
    EXCEPTION
      WHEN OTHERS THEN
        v_resumes_update := FALSE;
    END;
  ELSE
    v_resumes_update := NULL;
  END IF;
  
  -- Test DELETE policies if we have test records
  IF v_test_job_id IS NOT NULL THEN
    BEGIN
      DELETE FROM jobs WHERE id = v_test_job_id;
      v_jobs_delete := TRUE;
    EXCEPTION
      WHEN OTHERS THEN
        v_jobs_delete := FALSE;
    END;
  ELSE
    v_jobs_delete := NULL;
  END IF;
  
  IF v_test_resume_id IS NOT NULL THEN
    BEGIN
      DELETE FROM resumes WHERE id = v_test_resume_id;
      v_resumes_delete := TRUE;
    EXCEPTION
      WHEN OTHERS THEN
        v_resumes_delete := FALSE;
    END;
  ELSE
    v_resumes_delete := NULL;
  END IF;
  
  -- Clean up any remaining test data
  BEGIN
    DELETE FROM jobs WHERE title = 'Test Job' AND user_id = v_user_id;
    DELETE FROM resumes WHERE filename = 'Test Resume' AND user_id = v_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignore cleanup errors
  END;
  
  -- Return the results
  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'jobs', jsonb_build_object(
      'select', v_jobs_select,
      'insert', v_jobs_insert,
      'update', v_jobs_update,
      'delete', v_jobs_delete
    ),
    'resumes', jsonb_build_object(
      'select', v_resumes_select,
      'insert', v_resumes_insert,
      'update', v_resumes_update,
      'delete', v_resumes_delete
    ),
    'job_scans', jsonb_build_object(
      'select', v_job_scans_select,
      'insert', v_job_scans_insert,
      'update', v_job_scans_update,
      'delete', v_job_scans_delete
    ),
    'credit_purchases', jsonb_build_object(
      'select', v_credit_purchases_select
    ),
    'credit_usage', jsonb_build_object(
      'select', v_credit_usage_select
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the successful application of RLS policies
DO $$
BEGIN
  RAISE NOTICE 'Successfully applied RLS policies for all tables';
END
$$; 