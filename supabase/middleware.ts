import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Environment variables for consistent usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const updateSession = async (request: NextRequest) => {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // This hook enables us to set cookies inside of middleware
            request.cookies.set({
              name,
              value,
              ...options,
            });
            // Update the request headers
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('cookie', request.cookies.toString());
            // Update the request with the new headers
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            // Set cookies on the response
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            // This hook enables us to delete cookies inside of middleware
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            // Update the request headers
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('cookie', request.cookies.toString());
            // Update the request with the new headers
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            // Delete the cookie from the response
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Refresh the session
    const { data: { user } } = await supabase.auth.getUser();

    // If the user is trying to access protected routes but isn't logged in, redirect to login
    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return response;
  } catch (error) {
    console.error('Error in updateSession middleware:', error);
    // Return the original response in case of an error
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

/**
 * Middleware to handle Supabase authentication and temporary sessions
 */
export async function middleware(req: NextRequest) {
  return updateSession(req);
}
