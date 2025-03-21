import { test, expect } from '@playwright/test';
import { setupTestUser, cleanupTestUser } from '../helpers/auth-helper';

// Test data
const TEST_EMAIL = 'test-user@example.com';
const TEST_PASSWORD = 'test-password123!';
const JOB_DETAILS = {
  company: 'Test Company Inc.',
  position: 'Software Engineer',
  location: 'Remote',
  description: 'This is a test job description for integration testing.'
};

test.describe('Job Creation Flow', () => {
  let userId: string;

  // Set up a test user before all tests
  test.beforeAll(async () => {
    userId = await setupTestUser(TEST_EMAIL, TEST_PASSWORD);
  });

  // Clean up the test user after all tests
  test.afterAll(async () => {
    await cleanupTestUser(userId);
  });

  test('should allow a logged-in user to create a job', async ({ page }) => {
    // First, log in
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to job creation page
    await page.click('a[href="/dashboard/jobs/new"]');
    
    // Wait for the job creation form
    await expect(page).toHaveURL('/dashboard/jobs/new');
    
    // Fill out the job form
    await page.fill('input[name="company"]', JOB_DETAILS.company);
    await page.fill('input[name="position"]', JOB_DETAILS.position);
    await page.fill('input[name="location"]', JOB_DETAILS.location);
    await page.fill('textarea[name="description"]', JOB_DETAILS.description);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should redirect to the job detail page after creation
    await expect(page.url()).toContain('/dashboard/jobs/');
    
    // Verify job details are displayed
    await expect(page.getByText(JOB_DETAILS.company)).toBeVisible();
    await expect(page.getByText(JOB_DETAILS.position)).toBeVisible();
    await expect(page.getByText(JOB_DETAILS.location)).toBeVisible();
    
    // Navigate to jobs list to verify job was added
    await page.click('a[href="/dashboard/jobs"]');
    await expect(page).toHaveURL('/dashboard/jobs');
    
    // Verify the job appears in the list
    await expect(page.getByText(JOB_DETAILS.company)).toBeVisible();
    await expect(page.getByText(JOB_DETAILS.position)).toBeVisible();
  });
}); 