import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables with fallbacks for local testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create a Supabase client with the service role key for admin actions
const adminClient = createClient(supabaseUrl, supabaseKey);

/**
 * Wait for some time to allow Supabase operations to complete
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generates a unique timestamp-based email
 */
function generateUniqueEmail(): string {
  return `test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

/**
 * Creates a test user for integration testing
 * 
 * @param email - Test user email
 * @param password - Test user password
 * @returns The user ID of the created test user
 */
export async function setupTestUser(email: string, password: string, maxRetries = 3): Promise<string> {
  try {
    if (maxRetries <= 0) {
      throw new Error('Max retries reached when creating test user');
    }

    // Start fresh with a new unique email each time
    email = email || generateUniqueEmail();
    console.log(`Setting up test user with email: ${email}`);
    
    // Clean up any existing users with this email
    await thoroughCleanup(email);
    
    // Wait a moment after cleanup before creating
    await wait(500);
    
    // Create a new test user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm the email
    });
    
    if (authError) {
      console.log(`Auth user creation failed: ${authError.message}`);
      // Wait and retry with a new email
      await wait(1000);
      return setupTestUser(generateUniqueEmail(), password, maxRetries - 1);
    }
    
    if (!authData.user) {
      throw new Error('Failed to create test user: No user returned');
    }
    
    const userId = authData.user.id;
    console.log(`Auth user created with ID: ${userId}`);
    
    // Clean up any existing records with this ID in any tables
    await cleanupAllTablesForUserId(userId);
    
    // Create a corresponding record in the users table
    const { error: insertError } = await adminClient
      .from('users')
      .insert([{
        id: userId,
        email: email
      }]);
    
    if (insertError) {
      console.log(`User record creation failed: ${insertError.message}`);
      
      // Clean up the auth user we just created
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error(`Failed to clean up auth user: ${deleteError}`);
      }
      
      // Wait and retry with a new email
      await wait(1000);
      return setupTestUser(generateUniqueEmail(), password, maxRetries - 1);
    }
    
    console.log(`Test user created successfully: ${email} with ID ${userId}`);
    return userId;
  } catch (error) {
    console.error('Error setting up test user:', error);
    
    // Wait and retry with a new email if we haven't exhausted retries
    if (maxRetries > 1) {
      await wait(1000);
      return setupTestUser(generateUniqueEmail(), password, maxRetries - 1);
    }
    
    throw error;
  }
}

/**
 * Cleans up all tables for a specific user ID
 * 
 * @param userId - The user ID to clean up
 */
async function cleanupAllTablesForUserId(userId: string): Promise<void> {
  try {
    // Delete from jobs table
    await adminClient.from('jobs').delete().eq('user_id', userId);
    
    // Delete from users table
    await adminClient.from('users').delete().eq('id', userId);
    
    // Add other tables as needed
    
    // Wait for operations to complete
    await wait(300);
  } catch (error) {
    console.error(`Error cleaning up tables for user ${userId}:`, error);
  }
}

/**
 * Thorough cleanup for test users
 * 
 * @param email - Email of the test user to clean up
 */
async function thoroughCleanup(email: string): Promise<void> {
  try {
    if (!email) return;
    
    console.log(`Performing thorough cleanup for email: ${email}`);
    
    // First find any auth users with this email
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const testUsers = authUsers.users.filter(user => user.email === email);
    
    if (testUsers.length > 0) {
      console.log(`Found ${testUsers.length} auth users with email ${email}, cleaning up...`);
      for (const user of testUsers) {
        await cleanupTestUser(user.id);
        await wait(300);
      }
    } else {
      console.log(`No auth users found with email ${email}`);
    }
    
    // Check for orphaned records in the users table
    const { data: userRecords } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email);
      
    if (userRecords && userRecords.length > 0) {
      console.log(`Found ${userRecords.length} orphaned user records for ${email}, cleaning up...`);
      for (const record of userRecords) {
        await cleanupAllTablesForUserId(record.id);
      }
    }
    
    // Double-check auth users after cleanup
    const { data: finalAuthUsers } = await adminClient.auth.admin.listUsers();
    const remainingUsers = finalAuthUsers.users.filter(user => user.email === email);
    
    if (remainingUsers.length > 0) {
      console.log(`Still found ${remainingUsers.length} remaining auth users, cleaning up...`);
      for (const user of remainingUsers) {
        try {
          await adminClient.auth.admin.deleteUser(user.id);
          await wait(200);
        } catch (error) {
          console.error(`Failed to delete auth user ${user.id}:`, error);
        }
      }
    }
    
    console.log(`Thorough cleanup completed for ${email}`);
  } catch (error) {
    console.error(`Error in thoroughCleanup for ${email}:`, error);
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
    
    console.log(`Cleaning up test user with ID: ${userId}`);
    
    // First clean up any records in other tables
    await cleanupAllTablesForUserId(userId);
    
    // Then delete the auth user
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error(`Error deleting auth user: ${error.message}`);
    } else {
      console.log(`Test user deleted: ${userId}`);
    }
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
    await thoroughCleanup(email);
  } catch (error) {
    console.error(`Error cleaning up test user by email ${email}:`, error);
  }
} 