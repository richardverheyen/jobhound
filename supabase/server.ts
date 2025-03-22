"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CookieOptions } from "@supabase/ssr";

/**
 * Creates a Supabase client for server components with cookie handling
 * This is the recommended way to access Supabase with authenticated user sessions
 * in server components and API routes.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie errors in server components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie errors in server components
          }
        },
      },
    }
  );
}

// Alias for semantic clarity when importing
export const createServerComponentClient = createClient;
