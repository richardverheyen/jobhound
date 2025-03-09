-- Add resume_id column to job_scans
ALTER TABLE job_scans 
ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES resumes(id);

-- Update RLS policies for job_scans
ALTER TABLE job_scans ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own job scans
CREATE POLICY "Users can view their own job scans"
    ON job_scans
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to insert their own job scans
CREATE POLICY "Users can insert their own job scans"
    ON job_scans
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own job scans
CREATE POLICY "Users can update their own job scans"
    ON job_scans
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to delete their own job scans
CREATE POLICY "Users can delete their own job scans"
    ON job_scans
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Create a trigger to update updated_at
ALTER TABLE job_scans 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER update_job_scans_updated_at
    BEFORE UPDATE ON job_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 