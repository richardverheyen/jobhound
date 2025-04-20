import { NextRequest } from 'next/server';
import { updateSession } from '@/supabase/middleware';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Run the shared Supabase middleware
  return await updateSession(request);
}

// See "Matching Paths" below to learn more
export const config = {
};