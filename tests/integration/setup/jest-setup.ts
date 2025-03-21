// Increase timeout for all tests
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  console.log('Starting integration test suite');
  // Any global setup needed before all tests
});

// Global teardown
afterAll(async () => {
  console.log('Finished integration test suite');
  // Any global cleanup needed after all tests
}); 