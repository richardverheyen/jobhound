import { 
  createServerClient, 
  isLocalDev as _isLocalDev,
  logSupabaseEnvironment as _logSupabaseEnvironment,
  createServiceClient as _createServiceClient
} from './supabase/client';

// Create a single supabase client for the entire app
// Note: This is a direct server client without cookie handling.
// For server components with user authentication, use createServerComponentClient from supabase/server.ts
export const supabase = createServerClient();

// Re-export helper functions
export const isLocalDev = _isLocalDev;
export const logSupabaseEnvironment = _logSupabaseEnvironment;
export const createServiceClient = _createServiceClient;

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