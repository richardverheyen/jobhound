import { 
  createServerClient, 
  isLocalDev as _isLocalDev, 
  logSupabaseEnvironment as _logSupabaseEnvironment 
} from './supabase/client';

// Create a single supabase client for the entire app
export const supabase = createServerClient();

// Re-export helper functions
export const isLocalDev = _isLocalDev;
export const logSupabaseEnvironment = _logSupabaseEnvironment;

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