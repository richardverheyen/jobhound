/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node',
  testTimeout: 30000, // Increase timeout for integration tests
  setupFilesAfterEnv: ['./setup/jest-setup.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
};

module.exports = config; 