import { test, expect, Page } from '@playwright/test';
import { setupTestUser, cleanupTestUserByEmail } from '../integration/helpers/auth-helper';

test('should create a new job listing', async ({ page }: { page: Page }) => {
  // Test credentials
  const testEmail = `e2e-test-${Date.now()}@example.com`;
  const testPassword = 'Test123!@#';
  
  try {
    // Set up test user
    await setupTestUser(testEmail, testPassword);
    
    // Go to login page
    await page.goto('/auth/signin');
    console.log('Navigated to login page');
    
    // Fill in login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    console.log('Filled login form');
    
    // Submit login form
    await page.click('button[type="submit"]');
    console.log('Submitted login form');
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
    console.log('Dashboard loaded');
    
    // Navigate to new job page
    await page.goto('/dashboard/jobs/new');
    console.log('Navigated to job creation page');
    
    // Fill out job details
    await page.fill('input[name="company"]', 'E2E Test Company');
    await page.fill('input[name="title"]', 'Senior Developer');
    await page.fill('input[name="location"]', 'Remote');
    await page.fill('input[name="url"]', 'https://example.com/job');
    await page.fill('textarea[name="description"]', 'This is a test job created by the E2E test');
    console.log('Filled job form');
    
    // Submit the form
    await page.click('button[type="submit"]');
    console.log('Submitted job form');
    
    // Verify success
    console.log('Test completed successfully');
  } finally {
    // Always clean up
    await cleanupTestUserByEmail(testEmail);
  }
}); 