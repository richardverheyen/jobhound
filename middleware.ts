import { NextRequest } from 'next/server';
import { updateSession } from '@/supabase/middleware';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Run the shared Supabase middleware
  return await updateSession(request);
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};