// Script to sync existing auth users with the users table
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment variables with fallbacks for local testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create a Supabase client with the service role key for admin actions
const adminClient = createClient(supabaseUrl, supabaseKey);

async function syncExistingUsers() {
  try {
    console.log('Starting user sync process...');
    
    // Get all users from auth.users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }
    
    if (!authUsers || !authUsers.users || authUsers.users.length === 0) {
      console.log('No auth users found.');
      return;
    }
    
    console.log(`Found ${authUsers.users.length} auth users.`);
    
    // Get all existing user records from the users table
    const { data: existingUsers, error: existingError } = await adminClient
      .from('users')
      .select('id');
    
    if (existingError) {
      throw new Error(`Failed to fetch existing users: ${existingError.message}`);
    }
    
    // Create a set of existing user IDs for faster lookups
    const existingUserIds = new Set(existingUsers ? existingUsers.map(user => user.id) : []);
    console.log(`Found ${existingUserIds.size} existing user records.`);
    
    // Find auth users that don't have a corresponding user record
    const usersToCreate = authUsers.users.filter(authUser => !existingUserIds.has(authUser.id));
    console.log(`Found ${usersToCreate.length} auth users without user records.`);
    
    if (usersToCreate.length === 0) {
      console.log('No users need to be synced.');
      return;
    }
    
    // Create user records for each auth user
    const userRecords = usersToCreate.map(authUser => ({
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      updated_at: authUser.updated_at
    }));
    
    // Insert the user records
    const { data: insertResult, error: insertError } = await adminClient
      .from('users')
      .insert(userRecords)
      .select();
    
    if (insertError) {
      throw new Error(`Failed to insert user records: ${insertError.message}`);
    }
    
    console.log(`Successfully created ${insertResult.length} user records.`);
    console.log('User sync completed successfully.');
    
  } catch (error) {
    console.error('Error syncing users:', error);
  }
}

syncExistingUsers(); 