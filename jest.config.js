/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Specific glob patterns to only run unit tests at the root level
  // E2E tests are handled by Playwright
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
  ],
  // Exclude e2e tests and Playwright tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
    '/tests/integration/playwright/'
  ],
  // Setup files for all tests
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup/jest-setup.ts'],
};

module.exports = config; 