'use client';

import { createBrowserClient as createClientSsr } from '@supabase/ssr';
import { createClient as createClientJs, SupabaseClient } from '@supabase/supabase-js';
import { User } from '@/types';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for the entire app (client-side)
export const supabase = createClientSsr(supabaseUrl, supabaseAnonKey);

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

// For backward compatibility and explicit client creation if needed
export function createClient() {
  return supabase;
}

// Auth helpers with pre-bound client
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

// General client helper functions that take a client instance
// Useful for testing or if you need a custom client instance
export async function signInWithEmailUsingClient(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signUpWithEmailUsingClient(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOutUsingClient(client: SupabaseClient) {
  const { error } = await client.auth.signOut();
  return { error };
}

export async function getCurrentSessionUsingClient(client: SupabaseClient) {
  const { data, error } = await client.auth.getSession();
  return { session: data.session, error };
}

export async function getCurrentUserUsingClient(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  return { user: data.user, error };
}
