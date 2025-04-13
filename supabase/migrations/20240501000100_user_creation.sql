-- User Authentication Handling
-- This migration adds functions for user authentication and registration

-- Create a trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Skip anonymous users - they will be handled separately
  IF NEW.raw_app_meta_data->>'provider' = 'anonymous' THEN
    RETURN NEW;
  END IF;

  -- Check if the user already exists in the users table
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.id
  ) INTO v_exists;
  
  -- Only insert if the user doesn't already exist
  IF NOT v_exists THEN
    -- Extract profile information from auth data
    v_display_name := NEW.raw_user_meta_data->>'full_name';
    IF v_display_name IS NULL THEN
      v_display_name := NEW.raw_user_meta_data->>'name';
    END IF;
    
    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    
    -- Insert the user record
    INSERT INTO public.users (
      id,
      email,
      display_name,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      v_display_name,
      v_avatar_url,
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
