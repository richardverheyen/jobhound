'use client';

import { 
  createBrowserClient, 
  signInWithEmail as _signInWithEmail,
  signUpWithEmail as _signUpWithEmail,
  signOut as _signOut,
  getCurrentSession as _getCurrentSession,
  getCurrentUser as _getCurrentUser
} from '@/lib/supabase/client';

// Create a single supabase client for interacting with your database
export const supabase = createBrowserClient();

// Re-export auth helpers
export async function signInWithEmail(email: string, password: string) {
  return _signInWithEmail(supabase, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return _signUpWithEmail(supabase, email, password);
}

export async function signOut() {
  return _signOut(supabase);
}

export async function getCurrentSession() {
  return _getCurrentSession(supabase);
}

export async function getCurrentUser() {
  return _getCurrentUser(supabase);
} 