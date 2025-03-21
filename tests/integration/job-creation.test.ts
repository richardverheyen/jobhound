import { cleanupTestUser, setupTestUser } from './helpers/auth-helper';
import { createClient } from '@supabase/supabase-js';

// Helper function to generate unique test email
function generateUniqueTestEmail(): string {
  return `test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

// Get the test environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
// Use service role key to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Job Creation Flow', () => {
  jest.setTimeout(30000); // Increase timeout to 30 seconds for this suite
  
  let userId: string | null = null;
  const testEmail = generateUniqueTestEmail();
  const testPassword = 'Test1234!';
  
  beforeAll(async () => {
    try {
      userId = await setupTestUser(testEmail, testPassword);
      console.log(`Successfully created test user with ID: ${userId}`);
      
      if (!userId) {
        throw new Error('Failed to set up test user');
      }
    } catch (error) {
      console.error('Error setting up test user:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    if (userId) {
      try {
        await cleanupTestUser(userId);
        console.log(`Successfully cleaned up test user with ID: ${userId}`);
      } catch (error) {
        console.error(`Error cleaning up test user: ${error}`);
      }
    }
  });
  
  it('should create a new job record', async () => {
    if (!userId) {
      console.warn('Skipping test because user setup failed');
      return;
    }
    
    // Prepare job data
    const jobData = {
      company: 'Test Company',
      title: 'Software Engineer',
      location: 'Remote',
      description: 'Test job description'
    };
    
    // Insert job record
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        company: jobData.company,
        title: jobData.title,
        location: jobData.location,
        description: jobData.description
      })
      .select()
      .single();
    
    // Verify job was created successfully
    expect(error).toBeNull();
    expect(job).not.toBeNull();
    expect(job.company).toBe(jobData.company);
    expect(job.title).toBe(jobData.title);
    
    // Clean up - delete the job
    if (job && job.id) {
      await supabase.from('jobs').delete().eq('id', job.id);
    }
  });
}); 