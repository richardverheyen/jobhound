import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env file
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Credit System', () => {
  let userId: string;
  let userEmail: string;

  beforeAll(async () => {
    // Create a test user
    userEmail = `test-${uuidv4()}@test.com`;
    const { data, error } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: 'testpassword123',
      email_confirm: true
    });

    if (error) {
      throw error;
    }

    userId = data.user.id;
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      // Delete from auth
      await supabase.auth.admin.deleteUser(userId);
      
      // Delete related records
      await supabase.from('credit_usage').delete().eq('user_id', userId);
      await supabase.from('credit_purchases').delete().eq('user_id', userId);
      await supabase.from('users').delete().eq('id', userId);
    }
  });

  test('New user receives 10 free credits', async () => {
    // Get the user's credits
    const { data, error } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // Check if user has a credit_purchase record with 10 credits
    expect(data).toHaveLength(1);
    expect(data[0].credit_amount).toBe(10);
    expect(data[0].remaining_credits).toBe(10);
  });

  test('get_user_credit_summary function returns correct data', async () => {
    // Call the credit summary function
    const { data, error } = await supabase
      .rpc('get_user_credit_summary', {
        p_user_id: userId
      });

    if (error) {
      throw error;
    }

    // Verify the structure and values
    expect(data).toHaveProperty('available_credits', 10);
    expect(data).toHaveProperty('total_purchased', 10);
    expect(data).toHaveProperty('total_used', 0);
    expect(data).toHaveProperty('recent_usage');
    expect(Array.isArray(data.recent_usage)).toBe(true);
  });
}); 