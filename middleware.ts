import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/supabase/middleware';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Run the shared Supabase middleware
  await updateSession(request);

  // Modified path handling for serving PDF worker
  if (request.nextUrl.pathname === '/pdf.worker.min.js') {
    const response = NextResponse.next();
    response.headers.set('Content-Type', 'application/javascript');
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
  
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /examples (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.well-known).*)',
    '/pdf.worker.min.js',
    '/cmaps/:path*',
    '/standard_fonts/:path*'
  ],
};