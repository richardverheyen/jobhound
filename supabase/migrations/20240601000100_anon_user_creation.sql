-- Anonymous User Handling
-- This migration adds functions and triggers for handling anonymous users in a two-step process

-- Step 1: Handle creation of anonymous users
CREATE OR REPLACE FUNCTION public.handle_new_anon_user()
RETURNS TRIGGER AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Only proceed if this is an anonymous user
  IF NEW.raw_app_meta_data->>'provider' != 'anonymous' THEN
    RETURN NEW;
  END IF;

  -- Check if the user already exists in the users table
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.id
  ) INTO v_exists;
  
  -- Only insert if the user doesn't already exist
  IF NOT v_exists THEN
    -- Insert basic anonymous user record (without email)
    INSERT INTO public.users (
      id,
      is_anonymous,
      anonymous_expires_at,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      TRUE,
      NOW() + INTERVAL '24 hours',
      NEW.created_at,
      NEW.updated_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Complete anonymous user profile when they link to email/third-party auth
CREATE OR REPLACE FUNCTION public.complete_anon_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_is_anonymous BOOLEAN;
BEGIN
  -- Check if this was an anonymous user before the update
  SELECT is_anonymous INTO v_is_anonymous 
  FROM public.users 
  WHERE id = NEW.id;
  
  -- Only proceed if user exists and was anonymous
  IF v_is_anonymous IS NULL OR v_is_anonymous = FALSE OR NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update the user record with email and other information
  UPDATE public.users
  SET 
    email = NEW.email,
    is_anonymous = FALSE,
    anonymous_expires_at = NULL,
    updated_at = NOW()
  WHERE id = NEW.id
  RETURNING id INTO v_user_id;
  
  -- Check if the user already has credits
  IF NOT EXISTS (
    SELECT 1 FROM public.credit_purchases WHERE user_id = v_user_id
  ) THEN
    -- Grant 10 free credits to newly linked users
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for anonymous user handling
DROP TRIGGER IF EXISTS on_auth_anon_user_created ON auth.users;
CREATE TRIGGER on_auth_anon_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_anon_user();

DROP TRIGGER IF EXISTS on_auth_anon_user_updated ON auth.users;
CREATE TRIGGER on_auth_anon_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.complete_anon_user();

-- Function to clean up expired anonymous users (can be called by a cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_anonymous_users()
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark expired users in auth.users first 
  WITH expired_users AS (
    SELECT id FROM public.users
    WHERE is_anonymous = TRUE
    AND anonymous_expires_at < NOW()
  )
  DELETE FROM auth.users WHERE id IN (SELECT id FROM expired_users);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'deleted_count', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add is_anonymous field to JWT
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT 
    coalesce(
      nullif(current_setting('request.jwt.claim', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
    || 
    jsonb_build_object(
      'is_anonymous', 
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND is_anonymous = true
      )
    )
$$;

-- Add RLS policies that differentiate between anonymous and permanent users
-- Example 1: Limit the total number of jobs an anonymous user can create to 1
CREATE OR REPLACE FUNCTION check_anonymous_job_limit()
RETURNS BOOLEAN AS $$
BEGIN
  -- If user is not anonymous, always allow
  IF NOT (SELECT (auth.jwt()->>'is_anonymous')::boolean) THEN
    RETURN TRUE;
  END IF;
  
  -- If anonymous, check job count limit
  RETURN (
    SELECT COUNT(*) < 1 FROM jobs WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the function as a restrictive policy on jobs table
DROP POLICY IF EXISTS "Anonymous users limited to 1 job" ON jobs;
CREATE POLICY "Anonymous users limited to 1 job" 
  ON jobs 
  AS RESTRICTIVE 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (check_anonymous_job_limit());

-- Example 2: Only allow permanent users to create multiple resumes, anonymous limited to 1
DROP POLICY IF EXISTS "Anonymous users limited to 1 resume" ON resumes;
CREATE POLICY "Anonymous users limited to 1 resume" 
  ON resumes 
  AS RESTRICTIVE 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    NOT (SELECT (auth.jwt()->>'is_anonymous')::boolean) OR
    (SELECT COUNT(*) < 1 FROM resumes WHERE user_id = auth.uid())
  );

-- Example 3: Add a policy to restrict anonymous users access to certain tables
-- For this example, let's restrict anonymous access to credit_usage
DROP POLICY IF EXISTS "Only permanent users can access credit usage" ON credit_usage;
CREATE POLICY "Only permanent users can access credit usage" 
  ON credit_usage 
  FOR ALL 
  TO authenticated 
  USING (NOT (SELECT (auth.jwt()->>'is_anonymous')::boolean));

-- Example 4: Add a restrictive policy that prevents anonymous users from deleting data
DROP POLICY IF EXISTS "Anonymous users cannot delete jobs" ON jobs;
CREATE POLICY "Anonymous users cannot delete jobs" 
  ON jobs 
  AS RESTRICTIVE 
  FOR DELETE 
  TO authenticated 
  USING (NOT (SELECT (auth.jwt()->>'is_anonymous')::boolean));

DROP POLICY IF EXISTS "Anonymous users cannot delete resumes" ON resumes;
CREATE POLICY "Anonymous users cannot delete resumes" 
  ON resumes 
  AS RESTRICTIVE 
  FOR DELETE 
  TO authenticated 
  USING (NOT (SELECT (auth.jwt()->>'is_anonymous')::boolean)); 