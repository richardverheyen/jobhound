-- Add job_id column to job_scans if it doesn't exist
ALTER TABLE job_scans 
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id);

-- Add resume_id column if it doesn't exist (in case it wasn't added before)
ALTER TABLE job_scans 
ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES resumes(id);

-- Set default for id if not already set
ALTER TABLE job_scans 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Set default for created_at if not already set
ALTER TABLE job_scans 
ALTER COLUMN created_at SET DEFAULT NOW();

-- Set default for status if not already set
ALTER TABLE job_scans 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create index for job_id
CREATE INDEX IF NOT EXISTS job_scans_job_id_idx ON job_scans(job_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS job_scans_resume_id_idx ON job_scans(resume_id);
CREATE INDEX IF NOT EXISTS job_scans_user_id_idx ON job_scans(user_id); 