-- Disable RLS for job_scans table
ALTER TABLE job_scans DISABLE ROW LEVEL SECURITY;

-- Add insert policy for job_scans
DROP POLICY IF EXISTS "Users can insert their own scans" ON job_scans;
CREATE POLICY "Users can insert their own scans"
  ON job_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix foreign key constraint in api_usage
ALTER TABLE api_usage DROP CONSTRAINT IF EXISTS api_usage_scan_id_fkey;
ALTER TABLE api_usage ADD CONSTRAINT api_usage_scan_id_fkey
  FOREIGN KEY (scan_id) REFERENCES job_scans(id) ON DELETE SET NULL;
