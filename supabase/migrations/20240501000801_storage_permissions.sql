-- Storage Permissions
-- This migration adds explicit storage permissions for all roles

DO $$
BEGIN
  -- Grant storage schema usage to all roles
  EXECUTE 'GRANT USAGE ON SCHEMA storage TO authenticated, anon, service_role';
  
  -- Grant storage API usage to all roles
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'can_insert_object' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage')
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION storage.can_insert_object TO authenticated, anon';
  END IF;
  
  -- Grant permissions on storage objects table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT ON storage.objects TO anon';
  END IF;
  
  -- Grant permissions on storage buckets table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    EXECUTE 'GRANT SELECT ON storage.buckets TO authenticated, anon';
  END IF;
  
  -- Grant all storage permissions to service_role (may already be granted)
  EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role';
  EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO service_role';
  EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error setting storage permissions: %', SQLERRM;
END
$$; 