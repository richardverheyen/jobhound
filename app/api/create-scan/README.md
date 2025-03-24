# Create Scan API Route

This API route replaces the Supabase Edge Function for creating resume scans with Google Generative AI.

## Why We Migrated from Supabase Edge Function

The migration from Supabase Edge Functions to NextJS API routes was necessary because:

1. The Deno runtime in Supabase Edge Functions has more restrictive call stack limitations
2. Better integration with the rest of the Next.js application
3. Improved error handling and debugging capabilities
4. Easier local development and testing

## Functionality

This API route:

1. Authenticates the user via Supabase JWT token
2. Validates the job and resume exist and belong to the user
3. Downloads the resume file from Supabase Storage if needed
4. Creates a scan record via the `create_scan` RPC function
5. Processes the resume using Google's Generative AI (Gemini 1.5 Pro)
6. Updates the scan record with the analysis results
7. Updates credit usage information

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `GOOGLE_GENERATIVE_AI_API_KEY`: Google Generative AI API key

## API Usage

Call this API from client-side code using the `scanService.ts` helper functions. 