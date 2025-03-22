-- This migration improves user permission handling in all database functions.
-- It ensures that users can create, read, update, and delete their own related records correctly.

-- Update handle_new_user function to check if the user already exists
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

-- Improve the create_job function to handle user creation
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

-- Improve the create_resume function to handle user creation
CREATE OR REPLACE FUNCTION create_resume(
  p_filename TEXT,
  p_name TEXT,
  p_file_path TEXT,
  p_file_size INT8,
  p_file_url TEXT,
  p_set_as_default BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_resume_id UUID;
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
  
  -- Insert the resume record
  INSERT INTO resumes (
    user_id,
    filename,  -- This is displayed in the UI
    file_path,
    file_url,
    file_size,
    mime_type
  )
  VALUES (
    v_user_id,
    p_name,    -- Using the provided name as the display name
    p_file_path,
    p_file_url,
    p_file_size,
    'application/pdf'  -- Assuming PDF as per the upload restrictions
  )
  RETURNING id INTO v_resume_id;
  
  -- If set_as_default is true or this is the user's first resume, set it as default
  IF p_set_as_default OR NOT EXISTS (
    SELECT 1 FROM users WHERE id = v_user_id AND default_resume_id IS NOT NULL
  ) THEN
    UPDATE users SET default_resume_id = v_resume_id WHERE id = v_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'resume_id', v_resume_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improve the create_scan function to handle user creation
CREATE OR REPLACE FUNCTION create_scan(
  p_user_id UUID,
  p_job_id UUID,
  p_resume_id UUID,
  p_resume_filename TEXT,
  p_job_posting TEXT
) RETURNS UUID AS $$
DECLARE
  v_scan_id UUID;
  v_purchase_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user exists in the users table
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id
  ) INTO v_user_exists;
  
  -- If user doesn't exist yet in the users table, create it
  IF NOT v_user_exists THEN
    INSERT INTO public.users (
      id,
      email,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      (SELECT email FROM auth.users WHERE id = p_user_id),
      NOW(),
      NOW()
    );
    
    -- Also create initial credits if not present
    INSERT INTO public.credit_purchases (
      user_id,
      credit_amount,
      remaining_credits,
      purchase_date
    ) VALUES (
      p_user_id,
      10, -- 10 free credits
      10, -- all credits initially available
      NOW()
    );
    
    -- Get the ID of the credit purchase we just created
    SELECT id INTO v_purchase_id
    FROM credit_purchases
    WHERE user_id = p_user_id
    LIMIT 1;
  ELSE
    -- Find a credit purchase with remaining credits
    SELECT id INTO v_purchase_id
    FROM credit_purchases
    WHERE user_id = p_user_id
      AND remaining_credits > 0
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY expires_at ASC NULLS LAST
    LIMIT 1;
  END IF;
  
  -- Check if user has credits
  IF v_purchase_id IS NULL THEN
    RAISE EXCEPTION 'No credits available for user';
  END IF;
  
  -- Generate a new scan ID
  SELECT gen_random_uuid() INTO v_scan_id;
  
  -- Create the scan record
  INSERT INTO job_scans (
    id, 
    user_id, 
    job_id, 
    resume_id, 
    credit_purchase_id,
    resume_filename,
    job_posting,
    status,
    created_at
  ) VALUES (
    v_scan_id,
    p_user_id,
    p_job_id,
    p_resume_id,
    v_purchase_id,
    p_resume_filename,
    p_job_posting,
    'processing',
    NOW()
  );
  
  -- Decrement credits from the purchase
  UPDATE credit_purchases
  SET remaining_credits = remaining_credits - 1
  WHERE id = v_purchase_id;
  
  -- Record credit usage
  INSERT INTO credit_usage (
    id,
    purchase_id,
    user_id,
    scan_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_purchase_id,
    p_user_id,
    v_scan_id,
    NOW()
  );
  
  RETURN v_scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 