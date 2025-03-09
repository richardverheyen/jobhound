-- Create jobs table for storing job postings
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for the jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own jobs
CREATE POLICY "Users can view their own jobs"
    ON jobs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to insert their own jobs
CREATE POLICY "Users can insert their own jobs"
    ON jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own jobs
CREATE POLICY "Users can update their own jobs"
    ON jobs
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to delete their own jobs
CREATE POLICY "Users can delete their own jobs"
    ON jobs
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Create a trigger to update the updated_at timestamp
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for jobs if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = current_schema()
    AND tablename = 'jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE jobs';
  END IF;
END $$; 