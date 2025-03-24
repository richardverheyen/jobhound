-- Storage System Setup
-- This migration sets up the storage bucket for resumes
-- Note: By default storage RLS is enabled in Supabase, we need to explicitly set security policies

-- Check if storage extension is available and create bucket if needed
DO $$
BEGIN
  -- This will only run if the storage extension is available
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage'
  ) THEN
    -- Try to create the bucket, ignoring errors
    BEGIN
      -- Create the resumes bucket if it doesn't exist
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf']) -- 10MB limit, PDF only
      ON CONFLICT (id) DO UPDATE 
      SET file_size_limit = 10485760, 
          allowed_mime_types = ARRAY['application/pdf'];
    EXCEPTION
      WHEN OTHERS THEN
        -- Just log that there was an issue and continue
        RAISE NOTICE 'Note: Could not create storage bucket. This is expected in local development or if the bucket already exists.';
    END;
    
    -- Create storage RLS policies for authenticated users
    -- Since we can't check if the policies table exists directly (might cause error),
    -- we'll wrap each policy creation in its own exception block
    
    BEGIN
      -- Add policy to allow users to read their own files
      -- The format uses storage.foldername to extract the user ID from the path
      EXECUTE format('
        DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
        CREATE POLICY "Users can read their own files" ON storage.objects
        FOR SELECT
        TO authenticated
        USING (bucket_id = ''resumes'' AND auth.uid()::text = storage.foldername(name));
      ');
    EXCEPTION
      WHEN OTHERS THEN
        -- Other errors are reported but don't stop execution
        RAISE NOTICE 'Error creating SELECT policy: %', SQLERRM;
    END;
    
    BEGIN
      -- Add policy to allow users to upload files to their own folders
      EXECUTE format('
        DROP POLICY IF EXISTS "Users can upload to their own folders" ON storage.objects;
        CREATE POLICY "Users can upload to their own folders" ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = ''resumes'' AND auth.uid()::text = storage.foldername(name));
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating INSERT policy: %', SQLERRM;
    END;
    
    BEGIN
      -- Add policy to allow users to update their own files
      EXECUTE format('
        DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
        CREATE POLICY "Users can update their own files" ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = ''resumes'' AND auth.uid()::text = storage.foldername(name));
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating UPDATE policy: %', SQLERRM;
    END;
    
    BEGIN
      -- Add policy to allow users to delete their own files
      EXECUTE format('
        DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
        CREATE POLICY "Users can delete their own files" ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = ''resumes'' AND auth.uid()::text = storage.foldername(name));
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating DELETE policy: %', SQLERRM;
    END;
    
    -- Add service_role policies to allow functions with SECURITY DEFINER to access storage
    BEGIN
      -- Service role can read any resume files
      EXECUTE format('
        DROP POLICY IF EXISTS "Service role can read all files" ON storage.objects;
        CREATE POLICY "Service role can read all files" ON storage.objects
        FOR SELECT
        TO service_role
        USING (bucket_id = ''resumes'');
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating service role SELECT policy: %', SQLERRM;
    END;
    
    BEGIN
      -- Service role can upload resume files
      EXECUTE format('
        DROP POLICY IF EXISTS "Service role can upload files" ON storage.objects;
        CREATE POLICY "Service role can upload files" ON storage.objects
        FOR INSERT
        TO service_role
        WITH CHECK (bucket_id = ''resumes'');
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating service role INSERT policy: %', SQLERRM;
    END;
    
    BEGIN
      -- Service role can update resume files
      EXECUTE format('
        DROP POLICY IF EXISTS "Service role can update files" ON storage.objects;
        CREATE POLICY "Service role can update files" ON storage.objects
        FOR UPDATE
        TO service_role
        USING (bucket_id = ''resumes'');
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating service role UPDATE policy: %', SQLERRM;
    END;
    
    BEGIN
      -- Service role can delete resume files
      EXECUTE format('
        DROP POLICY IF EXISTS "Service role can delete files" ON storage.objects;
        CREATE POLICY "Service role can delete files" ON storage.objects
        FOR DELETE
        TO service_role
        USING (bucket_id = ''resumes'');
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating service role DELETE policy: %', SQLERRM;
    END;
    
    -- Add anonymous role policies to allow file uploads for new users without needing to be authenticated first
    BEGIN
      -- Anonymous users can upload to path with their user id
      EXECUTE format('
        DROP POLICY IF EXISTS "Anonymous users can upload files" ON storage.objects;
        CREATE POLICY "Anonymous users can upload files" ON storage.objects
        FOR INSERT
        TO anon
        WITH CHECK (bucket_id = ''resumes'' AND auth.uid()::text = storage.foldername(name));
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating anonymous INSERT policy: %', SQLERRM;
    END;
    
    -- Add direct policies to ensure universal access when needed
    BEGIN
      -- Allow authenticated users to access the resumes bucket directly
      EXECUTE format('
        DROP POLICY IF EXISTS "Authenticated direct access to resumes bucket" ON storage.objects;
        CREATE POLICY "Authenticated direct access to resumes bucket" ON storage.objects
        FOR ALL
        TO authenticated
        USING (bucket_id = ''resumes'')
        WITH CHECK (bucket_id = ''resumes'');
      ');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating direct bucket access policy: %', SQLERRM;
    END;
    
    -- Configure CORS for the storage bucket
    BEGIN
      -- Check if buckets_config table exists (might not in older Supabase versions)
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'buckets_config'
      ) THEN
        -- Update the CORS configuration for the resumes bucket
        UPDATE storage.buckets_config
        SET cors_origins = ARRAY['*'], -- Allow any origin for development
            cors_methods = ARRAY['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            cors_allowed_headers = ARRAY['*'], 
            cors_exposed_headers = ARRAY['Content-Range', 'Range', 'Content-Length'],
            cors_max_age_seconds = 3600
        WHERE bucket_id = 'resumes';
        
        -- Insert if not exists
        INSERT INTO storage.buckets_config (
          bucket_id, 
          cors_origins, 
          cors_methods, 
          cors_allowed_headers, 
          cors_exposed_headers, 
          cors_max_age_seconds
        )
        SELECT 
          'resumes',
          ARRAY['*'], -- Allow any origin for development
          ARRAY['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          ARRAY['*'], 
          ARRAY['Content-Range', 'Range', 'Content-Length'],
          3600
        WHERE NOT EXISTS (
          SELECT 1 FROM storage.buckets_config WHERE bucket_id = 'resumes'
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error configuring CORS: %', SQLERRM;
    END;
  END IF;
END $$;
