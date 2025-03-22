import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Get credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create Supabase client with admin privileges
const adminClient = createClient(supabaseUrl, supabaseKey);

describe('Credit System Trigger Integration Tests', () => {
  let userId: string;
  let userEmail: string;

  beforeAll(async () => {
    // Create a test user ID
    userId = uuidv4();
    userEmail = `credit-trigger-test-${Date.now()}@example.com`;
    
    // First clean up in case test previously failed
    await adminClient.from('credit_purchases').delete().eq('user_id', userId);
    await adminClient.from('users').delete().eq('id', userId);
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await adminClient.from('credit_purchases').delete().eq('user_id', userId);
      await adminClient.from('users').delete().eq('id', userId);
    }
  });

  test('New user should receive 10 free credits when created in auth and users table', async () => {
    // Create a new user in Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true // Auto-confirm the email
    });
    
    expect(authError).toBeNull();
    expect(authData.user).not.toBeNull();
    
    // Use the Auth user ID for consistency
    userId = authData.user!.id;
    
    // Check if a user record already exists
    const { data: existingUser } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    // If the user doesn't exist, create a record in the users table with the Auth user ID
    if (!existingUser) {
      const now = new Date().toISOString();
      const { error: userError } = await adminClient
        .from('users')
        .insert([{
          id: userId,
          email: userEmail,
          created_at: now,
          updated_at: now
        }]);
        
      expect(userError).toBeNull();
    }
    
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get the user's credit purchases
    const { data: creditData, error: creditError } = await adminClient
      .from('credit_purchases')
      .select('*')
      .eq('user_id', userId);
      
    expect(creditError).toBeNull();
    
    // Verify the credit record exists and has 10 credits
    expect(creditData).not.toBeNull();
    expect(creditData!.length).toBe(1);
    expect(creditData![0].credit_amount).toBe(10);
    expect(creditData![0].remaining_credits).toBe(10);
    
    // Verify the credit purchase has no expiration date
    expect(creditData![0].expires_at).toBeNull();
  });
  
  test('Credit summary functions return correct values for new users', async () => {
    // Call the credit summary function
    const { data: summaryData, error: summaryError } = await adminClient
      .rpc('get_user_credit_summary', {
        p_user_id: userId
      });
      
    expect(summaryError).toBeNull();
    expect(summaryData).not.toBeNull();
    
    // Verify the credit summary has the correct values
    expect(summaryData).toMatchObject({
      available_credits: 10,
      total_purchased: 10,
      total_used: 0
    });
    
    // Get just the available credits
    const { data: availableCredits, error: availableError } = await adminClient
      .rpc('get_user_available_credits', {
        p_user_id: userId
      });
      
    expect(availableError).toBeNull();
    expect(availableCredits).toBe(10);
  });
}); 