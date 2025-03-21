// @ts-nocheck
import { test, expect } from '@playwright/test';
import { cleanupTestUserByEmail } from '../integration/helpers/auth-helper';

test('should create a User record when auth user is created and redirect to dashboard', async ({ page }) => {
  // Test user details
  const testEmail = `e2e-test-${Date.now()}@example.com`;
  const testPassword = 'Test123!@#';
  const testName = 'Test User';
  
  try {
    // Navigate to signup page
    await page.goto('/auth/signup');
    
    // Fill in signup form
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    // Submit signup form
    await page.click('button[type="submit"]');
    
    // Wait for redirection to dashboard - this validates the redirect requirement
    await page.waitForURL('/dashboard');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify user name appears in the UI to confirm user record creation
    await expect(page.getByText(testName)).toBeVisible();
    
    // Additional verification for user being logged in
    // Check for logout button or user menu
    await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();
    
    // Navigate to profile page to verify user data is properly saved
    await page.goto('/dashboard/profile');
    
    // Verify profile page has the correct user information
    await expect(page.getByRole('textbox', { name: /name/i, exact: false }).filter({ hasValue: testName })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i, exact: false }).filter({ hasValue: testEmail })).toBeVisible();
    
  } finally {
    // Clean up test user
    await cleanupTestUserByEmail(testEmail);
  }
}); 