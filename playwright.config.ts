import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // E2E tests
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Define separate projects for different types of tests
  projects: [
    // Regular e2e tests
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Integration tests with global setup
    {
      name: 'integration',
      testDir: './tests/integration/playwright',
      globalSetup: './tests/integration/playwright/global-setup.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Longer timeout for integration tests
        actionTimeout: 30000,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
}); 