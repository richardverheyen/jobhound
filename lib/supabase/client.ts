/**
 * Consolidated Supabase client utilities
 *
 * This file provides a centralized place for Supabase client initialization
 * and helper functions. It's used by both client and server components.
 */
import { createBrowserClient as createClientSsr } from '@supabase/ssr';
import { createClient as createClientJs, SupabaseClient } from '@supabase/supabase-js';
import { User } from '@/types';

// Environment variables are automatically loaded from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper to check if we're using the local development environment
export const isLocalDev = () => {
  return supabaseUrl?.includes('localhost') || supabaseUrl?.includes('127.0.0.1');
};

// Helper to log the current environment
export const logSupabaseEnvironment = () => {
  if (isLocalDev()) {
    console.log('Using local Supabase instance:', supabaseUrl);
  } else {
    console.log('Using remote Supabase instance:', supabaseUrl);
  }
};

/**
 * Create a Supabase client for server-side use.
 * IMPORTANT: This does NOT handle cookies and should only be used in 
 * environments where no user session is needed (like edge functions, cron jobs, etc.)
 * For server components with user sessions, use the createServerComponentClient instead.
 */
export const createServerClient = () => {
  return createClientJs(supabaseUrl, supabaseAnonKey);
};

/**
 * Create a Supabase client with service role permissions.
 * IMPORTANT: Should ONLY be used in secure server environments (like edge functions, API routes)
 * NEVER expose this client to the browser.
 */
export const createServiceClient = () => {
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not defined!');
    // Fall back to anon key with a warning
    return createClientJs(supabaseUrl, supabaseAnonKey);
  }
  return createClientJs(supabaseUrl, supabaseServiceKey);
};

/**
 * Create a Supabase client for browser use (in client components)
 */
export const createBrowserClient = () => {
  return createClientSsr(supabaseUrl, supabaseAnonKey);
};

// Auth helpers (for client components)
export async function signInWithEmail(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signUpWithEmail(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut(client: SupabaseClient) {
  const { error } = await client.auth.signOut();
  return { error };
}

export async function getCurrentSession(client: SupabaseClient) {
  const { data, error } = await client.auth.getSession();
  return { session: data.session, error };
}

export async function getCurrentUser(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  return { user: data.user, error };
} 