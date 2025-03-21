/**
 * Script to clean test users and data from the local database
 */
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment variables with fallbacks for local testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create a Supabase client with the service role key for admin actions
const adminClient = createClient(supabaseUrl, supabaseKey);

/**
 * Clean test users and data from the database
 */
async function cleanTestUsers() {
  try {
    console.log('Starting test database cleanup...');

    // Find all test users (those with emails containing 'test-')
    const { data: users, error: userError } = await adminClient.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    
    const testUsers = users.users.filter(user => 
      user.email && (
        user.email.includes('test-') || 
        user.email.includes('e2e-test') || 
        user.email.includes('example.com')
      )
    );
    
    console.log(`Found ${testUsers.length} test users to clean up`);
    
    for (const user of testUsers) {
      console.log(`Cleaning up user: ${user.email} (${user.id})`);
      
      // Delete user data from all tables
      await adminClient.from('jobs').delete().eq('user_id', user.id);
      await adminClient.from('resumes').delete().eq('user_id', user.id);
      // Add other tables as needed
      
      // Delete the user record
      await adminClient.from('users').delete().eq('id', user.id);
      
      // Delete the auth user
      await adminClient.auth.admin.deleteUser(user.id);
    }
    
    console.log('Test database cleanup completed successfully');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  }
}

// Run the cleanup
cleanTestUsers().catch(console.error); 