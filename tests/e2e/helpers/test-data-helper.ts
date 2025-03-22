import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Get Supabase credentials for admin functions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create a Supabase client with the service role key for admin operations
const adminClient = createClient(supabaseUrl, supabaseKey);

/**
 * Creates a test job for a user
 * 
 * @param userId - User ID to create job for
 * @param jobData - Optional job data to override defaults
 * @returns The created job object
 */
export async function createTestJob(userId: string, jobData = {}): Promise<any> {
  const defaultJobData = {
    user_id: userId,
    company: 'Test Company',
    title: 'Test Position',
    location: 'Remote',
    description: 'This is a test job description for e2e testing. It includes keywords like JavaScript, React, Node.js, and TypeScript which are common in tech job descriptions.'
  };

  const { data, error } = await adminClient
    .from('jobs')
    .insert({
      ...defaultJobData,
      ...jobData
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test job: ${error.message}`);
  }

  console.log(`Created test job with ID: ${data.id} for user: ${userId}`);
  return data;
}

/**
 * Creates a test resume in storage and the database for a user
 * 
 * @param userId - User ID to create resume for
 * @param resumeData - Optional resume data to override defaults
 * @returns The created resume object
 */
export async function createTestResume(userId: string, resumeData = {}): Promise<any> {
  // Create a sample PDF file content
  const samplePdfPath = path.join(__dirname, '../fixtures/sample-resume.pdf');
  const testFilePath = `${userId}/test-resume-${Date.now()}.pdf`;
  let fileSize = 0;
  let fileUrl = '';

  try {
    // First check if sample PDF exists
    if (!fs.existsSync(samplePdfPath)) {
      console.warn(`Sample PDF not found at ${samplePdfPath}, using default`);
      // Create a default file if sample doesn't exist
      const defaultPdfBuffer = Buffer.from('%PDF-1.5 Sample Test Resume');
      
      // Upload the file to Supabase storage
      const { data: storageData, error: storageError } = await adminClient.storage
        .from('resumes')
        .upload(testFilePath, defaultPdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (storageError) {
        throw new Error(`Failed to upload test resume file: ${storageError.message}`);
      }
      
      // Get the public URL
      const { data: publicUrlData } = await adminClient.storage
        .from('resumes')
        .getPublicUrl(testFilePath);
      
      fileUrl = publicUrlData?.publicUrl || '';
      fileSize = defaultPdfBuffer.length;
    } else {
      // Read the sample file
      const fileContent = fs.readFileSync(samplePdfPath);
      fileSize = fileContent.length;
      
      // Upload the file to Supabase storage
      const { data: storageData, error: storageError } = await adminClient.storage
        .from('resumes')
        .upload(testFilePath, fileContent, {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (storageError) {
        throw new Error(`Failed to upload test resume file: ${storageError.message}`);
      }
      
      // Get the public URL
      const { data: publicUrlData } = await adminClient.storage
        .from('resumes')
        .getPublicUrl(testFilePath);
      
      fileUrl = publicUrlData?.publicUrl || '';
    }
    
    // Create record in resumes table
    const defaultResumeData = {
      user_id: userId,
      filename: 'Test Resume.pdf',
      file_path: testFilePath,
      file_url: fileUrl,
      file_size: fileSize,
      mime_type: 'application/pdf'
    };
    
    const { data, error } = await adminClient
      .from('resumes')
      .insert({
        ...defaultResumeData,
        ...resumeData
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create test resume record: ${error.message}`);
    }
    
    // Update user's default_resume_id
    await adminClient
      .from('users')
      .update({ default_resume_id: data.id })
      .eq('id', userId);
    
    console.log(`Created test resume with ID: ${data.id} for user: ${userId}`);
    return data;
  } catch (error) {
    console.error('Error creating test resume:', error);
    throw error;
  }
}

/**
 * Cleans up test jobs for a user
 * 
 * @param userId - User ID to clean up jobs for
 */
export async function cleanupTestJobs(userId: string): Promise<void> {
  try {
    // First get all jobs for this user
    const { data: jobs } = await adminClient
      .from('jobs')
      .select('id')
      .eq('user_id', userId);
    
    if (jobs && jobs.length > 0) {
      // Delete all job_scans related to these jobs
      for (const job of jobs) {
        await adminClient
          .from('job_scans')
          .delete()
          .eq('job_id', job.id);
      }
      
      // Now delete the jobs
      await adminClient
        .from('jobs')
        .delete()
        .eq('user_id', userId);
      
      console.log(`Cleaned up ${jobs.length} test jobs for user: ${userId}`);
    }
  } catch (error) {
    console.error(`Error cleaning up test jobs for user ${userId}:`, error);
  }
}

/**
 * Cleans up test resumes for a user
 * 
 * @param userId - User ID to clean up resumes for
 */
export async function cleanupTestResumes(userId: string): Promise<void> {
  try {
    // First get all resumes for this user
    const { data: resumes } = await adminClient
      .from('resumes')
      .select('id, file_path')
      .eq('user_id', userId);
    
    if (resumes && resumes.length > 0) {
      // Delete all job_scans related to these resumes
      for (const resume of resumes) {
        await adminClient
          .from('job_scans')
          .delete()
          .eq('resume_id', resume.id);
      }
      
      // Delete the resume records
      await adminClient
        .from('resumes')
        .delete()
        .eq('user_id', userId);
      
      // Clear default_resume_id reference in users table
      await adminClient
        .from('users')
        .update({ default_resume_id: null })
        .eq('id', userId);
      
      // Delete the files from storage
      for (const resume of resumes) {
        if (resume.file_path) {
          await adminClient.storage
            .from('resumes')
            .remove([resume.file_path]);
        }
      }
      
      // Try to remove the user directory as well
      try {
        await adminClient.storage
          .from('resumes')
          .remove([`${userId}/`]);
      } catch (err) {
        // It's okay if this fails, just means there might be other files
      }
      
      console.log(`Cleaned up ${resumes.length} test resumes for user: ${userId}`);
    }
  } catch (error) {
    console.error(`Error cleaning up test resumes for user ${userId}:`, error);
  }
} 