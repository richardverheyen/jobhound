-- Create a function to create a resume record
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
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
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