# Supabase Client Architecture

This directory contains the core Supabase client utilities for JobHound. This README explains the organization of our Supabase clients to ensure consistent usage across the application.

## Client Types

We have several types of Supabase clients for different use cases:

1. **Browser Client** - For client components (`'use client'`)
   - Import from: `@/lib/supabase/client` → `createBrowserClient()`
   - Used in client components where user context is needed
   - For convenience, you can also import a pre-instantiated instance from `@/app/utils/supabase`

2. **Server Client (No cookies)** - For server-side code without cookie handling
   - Import from: `@/lib/supabase/client` → `createServerClient()`
   - Used in background jobs, edge functions, or other contexts where user cookies aren't needed
   - Doesn't maintain user sessions across requests

3. **Server Component Client (With cookies)** - For server components with authentication
   - Import from: `@/supabase/server` → `createClient()` or `createServerComponentClient()`
   - Used in server components or API routes where user authentication is needed
   - Properly handles cookies for maintaining user sessions

## Guidelines

1. Always use the appropriate client for your context (client component, server component, etc.)
2. For server components that need to maintain user sessions, use the server component client
3. For edge functions or background jobs, use the server client
4. For administrative operations that bypass RLS, use the service client (server-side only!)

## Troubleshooting

If you're experiencing permission issues when querying Supabase:

1. Check which client you're using - it should match the context
2. Verify that Row Level Security (RLS) policies allow the operation
3. For server components, ensure you're using the client with cookie handling
4. For client components, make sure users are properly authenticated 