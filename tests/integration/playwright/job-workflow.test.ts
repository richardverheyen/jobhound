import { test, expect, Page } from '@playwright/test';
import { createTestUser, removeTestUser } from '../utils/test-utils';
import { TestUser } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { generateUniqueEmail } from '../utils/test-utils';

// Initialize Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Helper to perform login with a test user
 */
async function loginUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login and redirection to dashboard
  await expect(page).toHaveURL('/dashboard');
}

/**
 * Complete job application workflow test
 */
test.describe('Job Application Workflow', () => {
  let testUser: TestUser;
  
  // Set up a test user before all tests
  test.beforeAll(async () => {
    testUser = await createTestUser();
    console.log(`Created test user: ${testUser.email}`);
  });
  
  // Clean up the test user after all tests
  test.afterAll(async () => {
    if (testUser) {
      await removeTestUser(testUser);
      console.log(`Cleaned up test user: ${testUser.email}`);
    }
  });
  
  test('should allow user to manage their job application process', async ({ page }: { page: Page }) => {
    // Step 1: Login with the test user
    await loginUser(page, testUser);
    
    // Step 2: Navigate to job creation page
    await page.click('a[href="/dashboard/jobs/new"]');
    await expect(page).toHaveURL('/dashboard/jobs/new');
    
    // Step 3: Fill out job details
    const jobDetails = {
      company: 'Acme Corporation',
      position: 'Senior Software Engineer',
      location: 'San Francisco, CA (Remote)',
      description: 'Building next-generation software solutions for enterprise customers.'
    };
    
    await page.fill('input[name="company"]', jobDetails.company);
    await page.fill('input[name="position"]', jobDetails.position);
    await page.fill('input[name="location"]', jobDetails.location);
    await page.fill('textarea[name="description"]', jobDetails.description);
    
    // Step 4: Submit the job
    await page.click('button[type="submit"]');
    
    // Step 5: Verify redirect to job details page
    await expect(page.url()).toContain('/dashboard/jobs/');
    
    // Step 6: Verify job details are displayed
    await expect(page.getByText(jobDetails.company)).toBeVisible();
    await expect(page.getByText(jobDetails.position)).toBeVisible();
    await expect(page.getByText(jobDetails.location)).toBeVisible();
    
    // Step 7: Navigate to jobs list
    await page.click('a[href="/dashboard/jobs"]');
    await expect(page).toHaveURL('/dashboard/jobs');
    
    // Step 8: Verify job appears in the list
    await expect(page.getByText(jobDetails.company)).toBeVisible();
    await expect(page.getByText(jobDetails.position)).toBeVisible();
  });
  
  test('should handle resume upload workflow', async ({ page }: { page: Page }) => {
    // Skip this test for now until resume functionality is implemented
    test.skip();
    
    // Login with the test user
    await loginUser(page, testUser);
    
    // Navigate to resume upload page (adjust path as needed)
    await page.click('a[href="/dashboard/resumes/new"]');
    await expect(page).toHaveURL('/dashboard/resumes/new');
    
    // Fill out resume details
    await page.fill('input[name="name"]', 'Software Engineer Resume');
    
    // Note: We're skipping the actual file upload part for now
    // as it requires specific implementation details
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Verify successful upload
    await expect(page.getByText('Resume uploaded successfully')).toBeVisible();
    
    // Verify resume appears in the list
    await page.click('a[href="/dashboard/resumes"]');
    await expect(page.getByText('Software Engineer Resume')).toBeVisible();
  });
}); 