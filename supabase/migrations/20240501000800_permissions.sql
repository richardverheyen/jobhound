-- Permissions Configuration
-- This migration sets up proper permissions for authenticated users to access the database

-- Grant select permissions on users table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- Grant select permissions on jobs table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;

-- Grant select permissions on job_scans table to authenticated users
GRANT SELECT, INSERT, DELETE, UPDATE ON public.job_scans TO authenticated;

-- Grant select permissions on resumes table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;

-- Grant select permissions on credit_purchases table to authenticated users
GRANT SELECT ON public.credit_purchases TO authenticated;

-- Grant select permissions on credit_usage table to authenticated users
GRANT SELECT ON public.credit_usage TO authenticated;

-- Grant usage permissions on the public schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add permissions for service role to access all tables
DO $$
BEGIN
  -- Grant service_role access to all tables in public schema
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role');
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role');
  EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role');
  
  -- Ensure service_role has the necessary permissions for storage
  -- These might already be granted by default in Supabase but we'll make it explicit
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage'
  ) THEN
    BEGIN
      EXECUTE format('GRANT USAGE ON SCHEMA storage TO service_role');
      EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role');
      EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role');
      EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO service_role');
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error granting storage permissions to service_role: %', SQLERRM;
    END;
  END IF;
  
  -- Grant function execution privileges to anon and authenticated users
  -- For resume creation and management
  EXECUTE format('GRANT EXECUTE ON FUNCTION create_resume(TEXT, TEXT, TEXT, INT8, TEXT, TEXT, BOOLEAN) TO anon, authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION set_default_resume(UUID, UUID) TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION delete_resume(UUID) TO authenticated');
  
  -- Grant execution privileges for credit-related functions to authenticated users
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_user_credit_summary(UUID) TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_user_available_credits(UUID) TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_user_credit_history(UUID, INTEGER) TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_available_credits(UUID) TO authenticated');
END $$; 