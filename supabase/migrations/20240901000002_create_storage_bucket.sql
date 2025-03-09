-- Create resumes table for storing resume metadata
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for the resumes table
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own resumes
CREATE POLICY "Users can view their own resumes"
    ON resumes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to insert their own resumes
CREATE POLICY "Users can insert their own resumes"
    ON resumes
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own resumes
CREATE POLICY "Users can update their own resumes"
    ON resumes
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete their own resumes"
    ON resumes
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_resumes_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
