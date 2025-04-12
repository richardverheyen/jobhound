-- User Authentication Handling
-- This migration adds functions for user authentication and registration

-- Create a trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Check if the user already exists in the users table
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.id
  ) INTO v_exists;
  
  -- Only insert if the user doesn't already exist
  IF NOT v_exists THEN
    -- Insert the user record
    INSERT INTO public.users (
      id,
      email,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.created_at,
      NEW.updated_at
    )
    RETURNING id INTO v_user_id;
    
    -- Grant 10 free credits to new users
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

-- Create a trigger to call the function when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add function to create anonymous users for the onboarding flow
CREATE OR REPLACE FUNCTION create_anonymous_user(
  p_client_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_auth_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_existing_user JSONB;
BEGIN
  -- Check if a user with this fingerprint already exists
  IF p_client_fingerprint IS NOT NULL THEN
    SELECT jsonb_build_object('user_id', u.id, 'expires_at', u.anonymous_expires_at)
    INTO v_existing_user
    FROM public.users u
    WHERE u.device_fingerprint = p_client_fingerprint
      AND u.is_anonymous = TRUE
      AND u.anonymous_expires_at > NOW();
      
    -- If a user with this fingerprint exists, return it
    IF v_existing_user IS NOT NULL THEN
      RETURN v_existing_user;
    END IF;
  END IF;

  -- Set expiration to 24 hours from now (for onboarding flow)
  v_expires_at := NOW() + INTERVAL '24 hours';
  
  -- Create a new anonymous auth user
  v_auth_id := gen_random_uuid();
  
  -- Insert into auth.users with a temporary anonymous email
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    v_auth_id,
    'anonymous_' || v_auth_id || '@temporary.jobhound',
    crypt('temp_' || v_auth_id, gen_salt('bf')), -- Temporary password
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "anonymous", "providers": ["anonymous"]}',
    '{"is_anonymous": true}'
  );
  
  -- Create a new anonymous user in the public schema
  INSERT INTO public.users (
    id,
    is_anonymous,
    anonymous_expires_at,
    device_fingerprint,
    created_at,
    updated_at,
    auth_id
  ) VALUES (
    v_auth_id,  -- Use the same ID as the auth user
    TRUE,
    v_expires_at,
    p_client_fingerprint,
    NOW(),
    NOW(),
    v_auth_id
  )
  RETURNING id INTO v_user_id;
  
  -- Grant 10 free credits to anonymous users (same as regular users)
  INSERT INTO public.credit_purchases (
    user_id,
    credit_amount,
    remaining_credits,
    purchase_date,
    expires_at
  ) VALUES (
    v_user_id,
    10, -- 10 free credits, same as regular users
    10, -- all credits initially available
    NOW(),
    v_expires_at -- credits expire when the anonymous user expires
  );
  
  -- Note: In a real implementation, we would generate a JWT token here,
  -- but this can be handled by the frontend by signing in with the temporary 
  -- credentials after this function call
  
  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'auth_id', v_auth_id,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to convert anonymous user to registered user
CREATE OR REPLACE FUNCTION convert_anonymous_user(
  p_anonymous_user_id UUID, 
  p_email TEXT,
  p_full_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
  v_job_id UUID;
  v_resume_id UUID;
  v_auth_id UUID;
  v_remaining_credits INT;
  v_credit_id UUID;
BEGIN
  -- Check if anonymous user exists
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_anonymous_user_id AND is_anonymous = TRUE
  ) INTO v_exists;
  
  -- If anonymous user doesn't exist, we can't convert
  IF NOT v_exists THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Anonymous user not found');
  END IF;
  
  -- Get the job and resume IDs created during onboarding
  SELECT id INTO v_job_id FROM public.jobs WHERE user_id = p_anonymous_user_id ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_resume_id FROM public.resumes WHERE user_id = p_anonymous_user_id ORDER BY created_at DESC LIMIT 1;
  
  -- Check if both job and resume exist
  IF v_job_id IS NULL OR v_resume_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Job or resume not found');
  END IF;
  
  -- Get remaining credits and credit purchase ID
  SELECT cp.id, cp.remaining_credits 
  INTO v_credit_id, v_remaining_credits
  FROM public.credit_purchases cp
  WHERE cp.user_id = p_anonymous_user_id 
  ORDER BY cp.purchase_date DESC 
  LIMIT 1;
  
  -- Update the anonymous user with the provided email and remove anonymous flag
  UPDATE public.users
  SET email = p_email,
      full_name = p_full_name,
      is_anonymous = FALSE,
      anonymous_expires_at = NULL,
      updated_at = NOW()
  WHERE id = p_anonymous_user_id;
  
  -- Update the auth user record
  UPDATE auth.users
  SET email = p_email,
      raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'is_anonymous', false),
      updated_at = NOW()
  WHERE id = p_anonymous_user_id;
  
  -- Create a scan using one credit
  IF v_remaining_credits > 0 THEN
    -- Record credit usage for the scan
    INSERT INTO public.credit_usage (
      user_id,
      credit_amount,
      usage_type,
      usage_date,
      notes
    ) VALUES (
      p_anonymous_user_id,
      1, -- use 1 credit
      'scan',
      NOW(),
      'Onboarding flow scan'
    );
    
    -- Update remaining credits using the credit_id we retrieved earlier
    UPDATE public.credit_purchases 
    SET remaining_credits = v_remaining_credits - 1
    WHERE id = v_credit_id;
    
    -- TODO: In a real implementation, we would create the actual scan here
    -- or return the job/resume IDs for the front-end to create it
  END IF;
  
  -- Return success with job and resume IDs for scan creation/viewing
  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', p_anonymous_user_id,
    'job_id', v_job_id,
    'resume_id', v_resume_id,
    'remaining_credits', GREATEST(0, v_remaining_credits - 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function for cleanup of expired anonymous users
CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_users()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  -- Delete any users whose anonymous_expires_at has passed
  WITH deleted_users AS (
    DELETE FROM public.users
    WHERE is_anonymous = TRUE AND anonymous_expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted_users;
  
  -- Since we have cascading deletes set up in the database,
  -- this will automatically delete all related data
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 