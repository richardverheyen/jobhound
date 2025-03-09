-- Drop existing tables
DROP TABLE IF EXISTS job_scans CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- Create jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create job_scans table
CREATE TABLE job_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    resume_id UUID NOT NULL REFERENCES resumes(id),
    resume_filename TEXT NOT NULL,
    job_posting TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending',
    results JSONB,
    match_score FLOAT,
    error_message TEXT
);

-- Add indexes
CREATE INDEX job_scans_user_id_idx ON job_scans(user_id);
CREATE INDEX job_scans_job_id_idx ON job_scans(job_id);
CREATE INDEX job_scans_resume_id_idx ON job_scans(resume_id);
CREATE INDEX jobs_user_id_idx ON jobs(user_id);

-- Add RLS policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_scans ENABLE ROW LEVEL SECURITY;

-- Jobs policies
CREATE POLICY "Users can view their own jobs"
    ON jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
    ON jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
    ON jobs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
    ON jobs FOR DELETE
    USING (auth.uid() = user_id);

-- Job scans policies
CREATE POLICY "Users can view their own job scans"
    ON job_scans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job scans"
    ON job_scans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job scans"
    ON job_scans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job scans"
    ON job_scans FOR DELETE
    USING (auth.uid() = user_id);

-- Add updated_at trigger for jobs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 