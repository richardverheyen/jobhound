import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables with fallbacks for local testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create a Supabase client with the service role key for admin actions
const adminClient = createClient(supabaseUrl, supabaseKey);

/**
 * Creates a test user for integration testing
 * 
 * @param email - Test user email
 * @param password - Test user password
 * @returns The user ID of the created test user
 */
export async function setupTestUser(email: string, password: string): Promise<string> {
  try {
    // First try to delete the user if it exists (cleanup any previous test runs)
    await cleanupTestUserByEmail(email);
    
    // Create a new test user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm the email
    });
    
    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`);
    }
    
    if (!authData.user) {
      throw new Error('Failed to create test user: No user returned');
    }
    
    const userId = authData.user.id;
    
    // Create a corresponding record in the users table
    const { error: insertError } = await adminClient
      .from('users')
      .insert([{
        id: userId,
        email: email
      }]);
    
    if (insertError) {
      throw new Error(`Failed to create test user record: ${insertError.message}`);
    }
    
    console.log(`Test user created: ${email} with ID ${userId}`);
    return userId;
  } catch (error) {
    console.error('Error setting up test user:', error);
    throw error;
  }
}

/**
 * Cleans up a test user by ID
 * 
 * @param userId - The ID of the test user to clean up
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  try {
    if (!userId) return;
    
    // Delete the user's jobs
    await adminClient.from('jobs').delete().eq('user_id', userId);
    
    // Delete the user record
    await adminClient.from('users').delete().eq('id', userId);
    
    // Delete the auth user
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error(`Error deleting auth user: ${error.message}`);
    }
    
    console.log(`Test user deleted: ${userId}`);
  } catch (error) {
    console.error('Error cleaning up test user:', error);
  }
}

/**
 * Helper to cleanup a test user by email address
 * 
 * @param email - Email of the test user to clean up
 */
export async function cleanupTestUserByEmail(email: string): Promise<void> {
  try {
    // Find the user by email
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const testUser = authUsers.users.find(user => user.email === email);
    
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  } catch (error) {
    console.error(`Error cleaning up test user by email ${email}:`, error);
  }
} 