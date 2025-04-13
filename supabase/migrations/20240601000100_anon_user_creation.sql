-- Anonymous User Handling
-- This migration adds functions for handling anonymous users in a two-step process

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
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
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