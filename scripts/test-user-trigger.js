// Test script for user creation trigger
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment variables with fallbacks for local testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create a Supabase client with the service role key for admin actions
const adminClient = createClient(supabaseUrl, supabaseKey);

async function testUserTrigger() {
  try {
    // Generate a unique test email
    const testEmail = `trigger-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Creating test user: ${testEmail}`);
    
    // Create a test user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`);
    }
    
    if (!authData.user) {
      throw new Error('Failed to create test user: No user returned');
    }
    
    const userId = authData.user.id;
    console.log(`Test user created with auth ID: ${userId}`);
    
    // Wait a bit for the trigger to execute
    console.log(`Waiting for trigger to execute...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if a record was created in the users table
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      throw new Error(`Failed to fetch user record: ${userError.message}`);
    }
    
    // Verify the user record exists
    if (userData) {
      console.log(`SUCCESS: User record was automatically created in the users table:`);
      console.log(userData);
    } else {
      console.error(`ERROR: No user record was created in the users table.`);
    }
    
    // Clean up
    console.log(`Cleaning up test user...`);
    await adminClient.auth.admin.deleteUser(userId);
    console.log(`Test completed.`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUserTrigger(); 