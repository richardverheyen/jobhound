// @ts-nocheck
import { test, expect } from '@playwright/test';
import { setupTestUser, cleanupTestUserByEmail } from '../integration/helpers/auth-helper';
import path from 'path';
import fs from 'fs';

test('should upload a resume, view it in modal, and manage it', async ({ page }) => {
  // Test credentials
  const testEmail = `e2e-test-${Date.now()}@example.com`;
  const testPassword = 'Test123!@#';
  
  // Create a test PDF file to upload
  const testPdfPath = await createTestPdf();
  
  try {
    // Set up test user
    await setupTestUser(testEmail, testPassword);
    
    // Go to login page
    await page.goto('/auth/signin');
    
    // Fill in login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
    
    // Navigate to resumes page
    await page.goto('/dashboard/resumes');
    
    // Verify empty resumes list message
    await expect(page.getByText("No resumes yet")).toBeVisible();
    
    // Click on Upload New Resume button
    await page.getByText("Upload New Resume").click();
    
    // Verify we're on the new resume page
    await expect(page).toHaveURL('/dashboard/resumes/new');
    
    // Fill out the resume form
    await page.getByTestId("resume-name-input").fill('Test Resume');
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    // Submit the form
    await page.getByTestId("upload-resume-button").click();
    
    // Wait for redirect to resumes list
    await page.waitForURL('/dashboard/resumes');
    
    // Verify the resume was uploaded
    await expect(page.getByText("Test Resume")).toBeVisible();
    
    // Check if the resume has a default badge
    await expect(page.getByText("Default")).toBeVisible();
    
    // Click on View button to open the modal
    await page.getByRole('button', { name: 'View' }).click();
    
    // Wait for modal to appear
    await page.waitForSelector('div[role="dialog"]');
    
    // Close the modal
    await page.keyboard.press('Escape');
    
    // Verify the modal is closed
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
    
    // Add another resume to test setting default
    await page.getByText("Upload New Resume").click();
    await page.getByTestId("resume-name-input").fill('Second Resume');
    
    // Upload the file again
    await fileInput.setInputFiles(testPdfPath);
    
    await page.getByTestId("upload-resume-button").click();
    await page.waitForURL('/dashboard/resumes');
    
    // Verify second resume was uploaded
    await expect(page.getByText("Second Resume")).toBeVisible();
    
    // Set the second resume as default
    await page.getByRole('button', { name: 'Set as Default' }).click();
    
    // Delete the first resume
    await page.getByRole('button', { name: 'Delete' }).first().click();
    
    // Verify the first resume was deleted
    await expect(page.getByText("Test Resume")).not.toBeVisible();
    
    // Delete the second resume
    await page.getByRole('button', { name: 'Delete' }).click();
    
    // Verify we're back to empty state
    await expect(page.getByText("No resumes yet")).toBeVisible();
    
  } finally {
    // Always clean up
    await cleanupTestUserByEmail(testEmail);
    
    // Delete the test PDF file
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  }
});

/**
 * Creates a test PDF file for upload testing
 * @returns Path to the created test PDF file
 */
async function createTestPdf() {
  const tempDir = path.join(__dirname, '../../.temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const pdfPath = path.join(tempDir, `test-resume-${Date.now()}.pdf`);
  
  // Create a minimal valid PDF file
  const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
  
  fs.writeFileSync(pdfPath, pdfContent);
  
  return pdfPath;
} 