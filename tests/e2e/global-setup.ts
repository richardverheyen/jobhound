import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const adminClient = createClient(supabaseUrl, supabaseKey);

/**
 * Wait for some time to allow operations to complete
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clean up all test users in the database to ensure a clean testing environment
 */
async function cleanupAllTestUsers(): Promise<void> {
  console.log('Cleaning up all test users...');
  
  try {
    // Find all auth users with emails that contain 'test-'
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const testUsers = authUsers.users.filter(user => user.email?.includes('test-'));
    
    if (testUsers.length > 0) {
      console.log(`Found ${testUsers.length} test users to clean up`);
      
      for (const user of testUsers) {
        // Delete related data first
        await adminClient.from('jobs').delete().eq('user_id', user.id);
        try {
          await adminClient.from('resumes').delete().eq('user_id', user.id);
        } catch (e) {
          // Table might not exist yet
        }
        
        // Delete user record
        await adminClient.from('users').delete().eq('id', user.id);
        
        // Delete auth user
        await adminClient.auth.admin.deleteUser(user.id);
        
        console.log(`Removed test user: ${user.email}`);
        await wait(200);
      }
    } else {
      console.log('No test users found to clean up');
    }
  } catch (error) {
    console.error('Error cleaning up test users:', error);
  }
}

/**
 * Global setup function for Playwright tests
 */
async function globalSetup(): Promise<void> {
  console.log('Starting global setup for Playwright tests...');
  
  // Clean up any test data from previous runs
  await cleanupAllTestUsers();
  
  console.log('Global setup complete');
}

export default globalSetup; 