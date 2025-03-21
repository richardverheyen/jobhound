/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  verbose: true,
  testEnvironment: 'node',
  testTimeout: 30000, // Increase timeout for integration tests
  setupFilesAfterEnv: ['./setup/jest-setup.ts'],
  testMatch: ['**/tests/integration/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '../../tsconfig.test.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

module.exports = config; 