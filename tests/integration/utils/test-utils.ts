import { setupTestUser, cleanupTestUser } from '../helpers/auth-helper';
import { createClient } from '@supabase/supabase-js';
import { Job, Resume, TestUser } from '@/types';

// Initialize Supabase client for testing with service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cache for test users to avoid creating new ones for each test
const testUserCache: Record<string, { id: string; email: string; password: string }> = {};

/**
 * Generates a unique email for testing
 * @returns A unique email string
 */
export function generateUniqueEmail(): string {
  return `test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

/**
 * Creates a test user for integration testing
 * 
 * @param options.email - Optional email to use for the test user
 * @param options.password - Optional password to use for the test user
 * @param options.useCache - Whether to cache the user for reuse
 * @returns A TestUser object
 */
export async function createTestUser(options: {
  email?: string;
  password?: string;
  useCache?: boolean;
} = {}): Promise<TestUser> {
  const {
    email = generateUniqueEmail(),
    password = 'TestPassword123!',
    useCache = false
  } = options;
  
  // Check if we should use a cached user
  const cacheKey = 'default';
  if (useCache && testUserCache[cacheKey]) {
    console.log(`Using cached test user: ${testUserCache[cacheKey].email}`);
    return testUserCache[cacheKey];
  }
  
  // Create a new test user
  try {
    const userId = await setupTestUser(email, password);
    if (!userId) {
      throw new Error('Failed to create test user: No user ID returned');
    }
    
    const testUser = { id: userId, email, password };
    
    // Cache the user if requested
    if (useCache) {
      testUserCache[cacheKey] = testUser;
    }
    
    return testUser;
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }
}

/**
 * Cleans up a test user
 * 
 * @param user - The test user to clean up
 */
export async function removeTestUser(user: TestUser): Promise<void> {
  if (!user || !user.id) return;
  
  try {
    await cleanupTestUser(user.id);
    
    // Remove from cache if exists
    Object.keys(testUserCache).forEach(key => {
      if (testUserCache[key].id === user.id) {
        delete testUserCache[key];
      }
    });
  } catch (error) {
    console.error(`Failed to clean up test user ${user.id}:`, error);
  }
}

/**
 * Creates a job record for a test user
 * 
 * @param userId - The ID of the user to create the job for
 * @param jobData - The job data to create
 * @returns The created job data
 */
export async function createJob(userId: string, jobData: Partial<Job> = {}): Promise<Job> {
  // Default job data with required fields
  const defaultJobData: Partial<Job> = {
    user_id: userId,
    company: 'Test Company',
    title: 'Test Position',
    location: 'Test Location',
    description: 'Test job description',
    ...jobData
  };
  
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      company: defaultJobData.company!,
      title: defaultJobData.title!,
      location: defaultJobData.location,
      description: defaultJobData.description
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Failed to create job: No data returned');
  }
  
  return data as Job;
}

/**
 * Deletes a job record
 * 
 * @param jobId - The ID of the job to delete
 */
export async function deleteJob(jobId: string): Promise<void> {
  await supabase.from('jobs').delete().eq('id', jobId);
}

/**
 * Creates a resume record for a test user
 * 
 * @param userId - The ID of the user to create the resume for
 * @param resumeData - The resume data to create
 * @returns The created resume data
 */
export async function createResume(userId: string, resumeData: Partial<Resume> = {}): Promise<Resume> {
  // Default resume data with required fields
  const defaultResumeData: Partial<Resume> = {
    user_id: userId,
    filename: 'test-resume.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    ...resumeData
  };
  
  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: userId,
      filename: defaultResumeData.filename!,
      file_size: defaultResumeData.file_size,
      mime_type: defaultResumeData.mime_type
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create resume: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Failed to create resume: No data returned');
  }
  
  return data as Resume;
}

/**
 * Cleans up all test data for a user
 * 
 * @param userId - The ID of the user to clean up data for
 */
export async function cleanupTestData(userId: string): Promise<void> {
  // Delete all jobs
  await supabase.from('jobs').delete().eq('user_id', userId);
  
  // Delete all resumes (if the table exists)
  try {
    await supabase.from('resumes').delete().eq('user_id', userId);
  } catch (error) {
    // Table might not exist, that's okay
  }
  
  // Add other tables as needed
}

/**
 * Test setup and cleanup wrapper for tests
 * 
 * @param testFn - The test function to run
 * @param options - Options for test setup
 */
export function withTestUser(
  testFn: (user: TestUser) => Promise<void>,
  options: { useCache?: boolean } = {}
): () => Promise<void> {
  return async () => {
    let testUser: TestUser | null = null;
    
    try {
      // Create a test user
      testUser = await createTestUser({ useCache: options.useCache });
      
      // Run the test
      await testFn(testUser);
    } finally {
      // Clean up if not using cache
      if (testUser && !options.useCache) {
        await removeTestUser(testUser);
      }
    }
  };
} 