import { setupTestUser, cleanupTestUser } from './helpers/auth-helper';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Job Creation Flow', () => {
  let testUserId: string;
  const testUserEmail = `test-${Date.now()}@example.com`;
  const testUserPassword = 'Test123!@#';

  beforeAll(async () => {
    // Create a test user for the integration tests
    testUserId = await setupTestUser(testUserEmail, testUserPassword);
    
    // Ensure user was created successfully
    expect(testUserId).toBeTruthy();
  });

  afterAll(async () => {
    // Clean up the test user after tests
    if (testUserId) {
      await cleanupTestUser(testUserId);
    }
  });

  it('should create a new job record', async () => {
    // Test job data
    const jobData = {
      company: 'Test Company',
      title: 'Software Engineer',
      location: 'Remote',
      status: 'Applied',
      url: 'https://example.com/job',
      description: 'Test job description',
      salary: '$100,000 - $120,000',
      notes: 'Test notes',
    };

    // Insert job directly to test database
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: testUserId,
        company: jobData.company,
        title: jobData.title,
        location: jobData.location,
        status: jobData.status,
        url: jobData.url,
        description: jobData.description,
        salary: jobData.salary,
        notes: jobData.notes,
      })
      .select()
      .single();

    // Verify job was created successfully
    expect(error).toBeNull();
    expect(job).not.toBeNull();
    expect(job.company).toBe(jobData.company);
    expect(job.title).toBe(jobData.title);
    
    // Verify the job is associated with our test user
    expect(job.user_id).toBe(testUserId);
  });
}); 