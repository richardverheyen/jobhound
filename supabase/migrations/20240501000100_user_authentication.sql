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

-- Add function to create anonymous users
CREATE OR REPLACE FUNCTION create_anonymous_user()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set expiration to 7 days from now
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Create a new anonymous user
  INSERT INTO users (
    is_anonymous,
    anonymous_expires_at,
    created_at,
    updated_at
  ) VALUES (
    TRUE,
    v_expires_at,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;
  
  -- Give the anonymous user 3 free credits
  INSERT INTO credit_purchases (
    user_id,
    credit_amount,
    remaining_credits,
    purchase_date,
    expires_at
  ) VALUES (
    v_user_id,
    3, -- 3 free credits for anonymous users
    3, -- all credits initially available
    NOW(),
    v_expires_at -- credits expire when the anonymous user expires
  );
  
  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to convert anonymous user to registered user
CREATE OR REPLACE FUNCTION convert_anonymous_user(
  p_anonymous_user_id UUID, 
  p_registered_user_id UUID,
  p_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if the registered user exists
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_registered_user_id
  ) INTO v_exists;
  
  -- If registered user already exists, we can't convert
  IF v_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Check if anonymous user exists
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_anonymous_user_id AND is_anonymous = TRUE
  ) INTO v_exists;
  
  -- If anonymous user doesn't exist, we can't convert
  IF NOT v_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Transfer anonymous user data to the registered user ID
  UPDATE public.users
  SET id = p_registered_user_id,
      email = p_email,
      is_anonymous = FALSE,
      anonymous_expires_at = NULL,
      updated_at = NOW()
  WHERE id = p_anonymous_user_id;
  
  -- Update any related records with the new user ID
  UPDATE public.credit_purchases SET user_id = p_registered_user_id WHERE user_id = p_anonymous_user_id;
  UPDATE public.credit_usage SET user_id = p_registered_user_id WHERE user_id = p_anonymous_user_id;
  UPDATE public.resumes SET user_id = p_registered_user_id WHERE user_id = p_anonymous_user_id;
  UPDATE public.jobs SET user_id = p_registered_user_id WHERE user_id = p_anonymous_user_id;
  UPDATE public.job_scans SET user_id = p_registered_user_id WHERE user_id = p_anonymous_user_id;
  
  -- Success
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 