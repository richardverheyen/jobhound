-- Create a function to execute SQL queries
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if another function exists
CREATE OR REPLACE FUNCTION check_function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = split_part(function_name, '.', 2)
    AND n.nspname = split_part(function_name, '.', 1)
  ) INTO func_exists;
  
  RETURN func_exists;
END;
$$ LANGUAGE plpgsql;
