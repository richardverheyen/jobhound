import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials for admin functions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create a Supabase client with the service role key for admin operations
const adminClient = createClient(supabaseUrl, supabaseKey);

/**
 * Creates a test user via the Supabase admin API
 * 
 * @param email - Test user email (must contain "e2e-test")
 * @param password - Test user password
 * @param name - Test user display name (stored in user metadata only)
 * @returns The created user's ID
 */
export async function createTestUser(email: string, password: string, name?: string): Promise<string> {
  console.log(`Creating test user with email ${email}`);
  
  // First check if a user with this email already exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(u => u.email === email);
  
  let userId;
  
  if (existingUser) {
    console.log(`User with email ${email} already exists, using existing user`);
    userId = existingUser.id;
  } else {
    // Create user in Auth
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: name || email.split('@')[0]
      }
    });
    
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }
    
    if (!data.user) {
      throw new Error('Failed to create test user: No user returned');
    }
    
    userId = data.user.id;
    console.log(`Created test user with ID: ${userId}`);
  }
  
  // Check if a record in the users table already exists
  const { data: existingRecords } = await adminClient
    .from('users')
    .select('id')
    .eq('id', userId);
  
  if (!existingRecords || existingRecords.length === 0) {
    // Create a record in the users table
    const { error: insertError } = await adminClient
      .from('users')
      .insert([{
        id: userId,
        email: email
      }]);
    
    if (insertError) {
      console.error(`Error creating user record: ${insertError.message}`);
      // Don't throw here, we might still be able to continue with the test
    }
  } else {
    console.log(`User record for ${email} already exists in users table`);
  }
  
  // Check if the user already has credits
  const { data: existingCredits } = await adminClient
    .from('credit_purchases')
    .select('id')
    .eq('user_id', userId);
  
  if (!existingCredits || existingCredits.length === 0) {
    // Create initial credits for the user
    const { error: creditError } = await adminClient
      .from('credit_purchases')
      .insert({
        user_id: userId,
        credit_amount: 10,
        remaining_credits: 10,
        transaction_type: 'signup_bonus',
        amount_paid: 0
      });
    
    if (creditError) {
      console.warn(`Warning: Failed to create initial credits: ${creditError.message}`);
      // Continue anyway, we don't want to fail the test just because credits couldn't be created
    }
  } else {
    console.log(`User ${email} already has credits`);
  }
  
  return userId;
}

/**
 * Signs in a test user via the UI
 * 
 * @param page - Playwright page
 * @param email - User email
 * @param password - User password
 */
export async function signInTestUser(page: any, email: string, password: string): Promise<void> {
  console.log(`Signing in test user with email ${email}`);
  
  // Navigate to login page
  await page.goto('/auth/login');
  
  try {
    // Fill in login form
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    
    // Submit the form - updated selector for the new button format
    await page.click('button[type="submit"]:has-text("Log in")');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    console.log('User signed in successfully');
  } catch (error) {
    console.error('Error signing in test user:', error);
    throw error;
  }
}

/**
 * Creates a test user and then signs them in via the UI
 * 
 * @param page - Playwright page
 * @param email - User email (optional, will generate if not provided)
 * @param password - User password (optional, will use default if not provided)
 * @param name - User display name (optional, will use default if not provided)
 * @returns The test user info
 */
export async function createAndSignInTestUser(
  page: any, 
  email?: string, 
  password?: string, 
  name?: string
): Promise<{id: string, email: string, password: string, name?: string}> {
  // Generate test user details if not provided
  const testEmail = email || `e2e-test-${Date.now()}@example.com`;
  const testPassword = password || 'Test123!@#';
  const testName = name || testEmail.split('@')[0];
  
  // Create the user via the API
  const userId = await createTestUser(testEmail, testPassword, testName);
  
  // Sign in the user via the UI
  await signInTestUser(page, testEmail, testPassword);
  
  return {
    id: userId,
    email: testEmail,
    password: testPassword,
    name: testName
  };
}

/**
 * Cleans up a test user by email
 */
export async function cleanupTestUserByEmail(email: string): Promise<void> {
  try {
    // Find the user ID
    const { data: users } = await adminClient.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`No user found with email ${email}, skipping cleanup`);
      return;
    }
    
    const userId = user.id;
    
    // Delete credits first to avoid foreign key constraints
    await adminClient.from('credit_purchases').delete().eq('user_id', userId);
    
    // Delete user record from users table
    await adminClient.from('users').delete().eq('id', userId);
    
    // Finally delete the auth user
    await adminClient.auth.admin.deleteUser(userId);
    
    console.log(`Successfully cleaned up user with email ${email}`);
  } catch (error) {
    console.error(`Error cleaning up test user ${email}:`, error);
  }
} 