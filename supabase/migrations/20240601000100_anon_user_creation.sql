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
  v_old_provider TEXT;
  v_new_provider TEXT;
BEGIN
  -- Extract providers from old and new data
  v_old_provider := OLD.raw_app_meta_data->>'provider';
  v_new_provider := NEW.raw_app_meta_data->>'provider';
  
  -- Only proceed if this is an anonymous user being converted to a regular user
  IF v_old_provider != 'anonymous' OR v_new_provider = 'anonymous' THEN
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

-- RPC Functions for Anonymous User Management
-- ==========================================

-- Function to create a new anonymous user
CREATE OR REPLACE FUNCTION public.create_new_anonymous_user()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_password TEXT;
  v_result JSONB;
BEGIN
  -- Generate unique email and password for the anonymous user
  v_user_id := uuid_generate_v4();
  v_email := 'anonymous_' || v_user_id || '@temporary.jobhound';
  v_password := 'temp_' || v_user_id;
  
  -- Create user in auth.users with anonymous provider
  -- This will trigger our handle_new_anon_user trigger
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    (SELECT instance_id FROM auth.instances LIMIT 1),
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'anonymous'),
    jsonb_build_object('full_name', 'Anonymous User'),
    NOW(),
    NOW()
  );
  
  -- Return user details
  v_result := jsonb_build_object(
    'user_id', v_user_id,
    'email', v_email,
    'password', v_password
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert an anonymous user to a regular user
CREATE OR REPLACE FUNCTION public.convert_anonymous_user(
  p_anonymous_user_id UUID,
  p_email TEXT,
  p_full_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_job_id UUID;
BEGIN
  -- Validate inputs
  IF p_anonymous_user_id IS NULL OR p_email IS NULL OR p_full_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Missing required parameters'
    );
  END IF;
  
  -- Check if the user exists and is anonymous
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_anonymous_user_id AND is_anonymous = TRUE
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found or not an anonymous user'
    );
  END IF;
  
  -- Update auth.users - this will trigger our complete_anon_user trigger
  UPDATE auth.users SET
    email = p_email,
    raw_app_meta_data = raw_app_meta_data - 'provider' || jsonb_build_object('provider', 'email'),
    raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name),
    updated_at = NOW()
  WHERE id = p_anonymous_user_id;
  
  -- Get the user's most recent job ID for redirect
  SELECT id INTO v_job_id 
  FROM jobs 
  WHERE user_id = p_anonymous_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', TRUE,
    'user_id', p_anonymous_user_id,
    'job_id', v_job_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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