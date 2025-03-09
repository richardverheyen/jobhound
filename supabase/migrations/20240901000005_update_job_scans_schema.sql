-- Update existing records to have valid values
UPDATE job_scans SET
  user_id = COALESCE(user_id, auth.uid()),
  resume_filename = COALESCE(resume_filename, 'Unknown'),
  created_at = COALESCE(created_at, NOW()),
  status = COALESCE(status, 'pending')
WHERE user_id IS NULL 
   OR resume_filename IS NULL 
   OR created_at IS NULL 
   OR status IS NULL;

-- Set NOT NULL constraints
ALTER TABLE job_scans ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE job_scans ALTER COLUMN resume_filename SET NOT NULL;
ALTER TABLE job_scans ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE job_scans ALTER COLUMN status SET NOT NULL;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_scans_user_id_fkey'
  ) THEN
    ALTER TABLE job_scans
    ADD CONSTRAINT job_scans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$; 