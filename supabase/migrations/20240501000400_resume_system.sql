-- Resume Management System
-- This migration adds resume tables, functions and policies

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  file_size INT8,
  mime_type TEXT,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resumes updated_at trigger
CREATE TRIGGER update_resumes_updated_at
BEFORE UPDATE ON resumes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for resume-related tables
CREATE INDEX idx_resumes_user_id ON resumes(user_id);

-- Enable Row Level Security on resumes
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Create resume RLS policies
CREATE POLICY "Users can view their own resumes" 
  ON resumes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes" 
  ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes" 
  ON resumes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes" 
  ON resumes FOR DELETE USING (auth.uid() = user_id);

-- Create function to set a default resume
CREATE OR REPLACE FUNCTION set_default_resume(p_user_id UUID, p_resume_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_resume_exists BOOLEAN;
BEGIN
  -- Check if the resume exists and belongs to the user
  SELECT EXISTS (
    SELECT 1 FROM resumes 
    WHERE id = p_resume_id AND user_id = p_user_id
  ) INTO v_resume_exists;
  
  -- If resume doesn't exist or doesn't belong to the user
  IF NOT v_resume_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Set as default resume
  UPDATE users
  SET default_resume_id = p_resume_id
  WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to create a resume
CREATE OR REPLACE FUNCTION create_resume(
  p_filename TEXT,
  p_name TEXT,
  p_file_path TEXT,
  p_file_size INT8,
  p_file_url TEXT,
  p_raw_text TEXT DEFAULT NULL,
  p_set_as_default BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_resume_id UUID;
  v_user_id UUID;
  v_user_exists BOOLEAN;
  v_resume JSONB;
  v_storage_error TEXT;
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
  
  -- Validate storage path exists - handled by storage policies now
  -- instead try to catch any storage-related errors in the application code
  
  -- Insert the resume record
  INSERT INTO resumes (
    user_id,
    filename,  -- This is displayed in the UI
    file_path,
    file_url,
    file_size,
    mime_type,
    raw_text
  )
  VALUES (
    v_user_id,
    p_name,    -- Using the provided name as the display name
    p_file_path,
    p_file_url,
    p_file_size,
    'application/pdf',  -- Assuming PDF as per the upload restrictions
    p_raw_text
  )
  RETURNING id INTO v_resume_id;
  
  -- If set_as_default is true or this is the user's first resume, set it as default
  IF p_set_as_default OR NOT EXISTS (
    SELECT 1 FROM users WHERE id = v_user_id AND default_resume_id IS NOT NULL
  ) THEN
    UPDATE users SET default_resume_id = v_resume_id WHERE id = v_user_id;
  END IF;
  
  -- Get a complete view of the resume to return
  SELECT jsonb_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'filename', r.filename,
    'file_path', r.file_path,
    'file_url', r.file_url,
    'file_size', r.file_size,
    'mime_type', r.mime_type,
    'raw_text', r.raw_text,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'is_default', (u.default_resume_id = r.id)
  ) INTO v_resume
  FROM resumes r
  JOIN users u ON r.user_id = u.id
  WHERE r.id = v_resume_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'resume_id', v_resume_id,
    'resume', v_resume
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return detailed error information
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to delete a resume including its storage file
CREATE OR REPLACE FUNCTION delete_resume(p_resume_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_file_path TEXT;
  v_is_default BOOLEAN;
  v_new_default_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if the resume exists and belongs to the user
  SELECT 
    file_path,
    (SELECT default_resume_id = p_resume_id FROM users WHERE id = v_user_id)
  INTO v_file_path, v_is_default
  FROM resumes
  WHERE id = p_resume_id AND user_id = v_user_id;
  
  -- If resume doesn't exist or doesn't belong to the user
  IF v_file_path IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Handle default resume change if needed
  IF v_is_default THEN
    -- Find another resume to set as default
    SELECT id INTO v_new_default_id
    FROM resumes
    WHERE user_id = v_user_id AND id != p_resume_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update default resume
    UPDATE users
    SET default_resume_id = v_new_default_id
    WHERE id = v_user_id;
  END IF;
  
  -- Delete resume record
  DELETE FROM resumes
  WHERE id = p_resume_id AND user_id = v_user_id;
  
  -- Note: The storage file must be deleted from the client side
  -- as PostgreSQL functions can't directly interact with the storage API
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to handle default resume updates when a resume is deleted
CREATE OR REPLACE FUNCTION handle_resume_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_new_default_id UUID;
BEGIN
  -- If this was the default resume, find another one to set as default
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = OLD.user_id AND default_resume_id = OLD.id
  ) THEN
    -- Find the newest resume
    SELECT id INTO v_new_default_id
    FROM resumes
    WHERE user_id = OLD.user_id AND id != OLD.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update default resume
    UPDATE users
    SET default_resume_id = v_new_default_id
    WHERE id = OLD.user_id;
  END IF;
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_resume_delete trigger: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a trigger to update default resume when a resume is deleted
DROP TRIGGER IF EXISTS on_resume_delete ON resumes;
CREATE TRIGGER on_resume_delete
  AFTER DELETE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION handle_resume_delete(); 