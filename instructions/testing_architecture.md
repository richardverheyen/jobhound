Testing Framework: Jest
Language: TypeScript
Orchestration: Docker Compose
API Client: Supertest
Database Client: Supabase JS Client

/your-project
  /tests
    /integration
      /setup                  # Test environment setup
        docker-compose.yml    # Local Supabase + stripe-mock
        seed-data.sql         # Initial test data
        fixtures.ts           # Test fixtures
      /helpers                # Test utilities
        auth-helper.ts        # Authentication utilities
        stripe-helper.ts      # Stripe mocking utilities 
        supabase-helper.ts    # Database utilities
      /tests                  # The actual test files
        credit-flow.test.ts   # Test 1: Credit purchase and usage
        resume-job-scan.test.ts  # Test 2: Resume-job matching
        session-auth.test.ts  # Test 3: Session authentication
        stripe-webhook.test.ts # Test 4: Stripe webhooks
        db-functions.test.ts  # Test 5: Database functions
      jest.config.js          # Jest configuration


Key Integration Tests for Your Application
1. User Credit Flow Tests
javascriptCopy// Test the complete purchase-to-usage credit flow
async function testCreditPurchaseAndUsage() {
  // 1. Create test user
  // 2. Simulate Stripe checkout completion
  // 3. Verify credit_purchases record created with correct amount
  // 4. Call use_credit function
  // 5. Verify credit was deducted and usage recorded
}
2. Resume-Job Matching Flow Tests
javascriptCopy// Test the job scanning functionality
async function testResumeJobScanFlow() {
  // 1. Create test user with credits
  // 2. Upload test resume
  // 3. Create test job
  // 4. Trigger job scan
  // 5. Verify scan record created and credit consumed
}
3. Authentication and Session Tests
javascriptCopy// Test temporary session functionality
async function testTemporarySessionAccess() {
  // 1. Create temporary session ID
  // 2. Call set-temporary-session endpoint
  // 3. Verify access to restricted resources
  // 4. Verify isolation between different sessions
}
4. Stripe Webhook Integration Tests
javascriptCopy// Test Stripe webhook handling
async function testStripeWebhookProcessing() {
  // 1. Mock a Stripe checkout.session.completed event
  // 2. Send to webhook endpoint
  // 3. Verify credit purchase created with correct expiration
}
5. Database Function Tests
javascriptCopy// Test database functions directly
async function testDatabaseFunctions() {
  // Test get_available_credits function
  // Test create_job_scan function
  // Test use_credit function
  // Test set_default_resume function
}