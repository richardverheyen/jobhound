import { createClient } from '@supabase/supabase-js';

// Environment variables are automatically loaded from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if we're using the local development environment
export const isLocalDev = () => {
  return supabaseUrl === 'http://localhost:54321';
};

// Helper to log the current environment
export const logSupabaseEnvironment = () => {
  if (isLocalDev()) {
    console.log('Using local Supabase instance:', supabaseUrl);
  } else {
    console.log('Using remote Supabase instance:', supabaseUrl);
  }
};

// Helper function to get user session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return data.session;
}

// Helper function to sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    return false;
  }
  return true;
} 