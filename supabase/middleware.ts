import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if user is trying to access dashboard routes
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  const isRootRoute = request.nextUrl.pathname === '/';
  
  // Not logged in users redirected to login except for root and auth routes
  // if (!user && !isRootRoute && !isAuthRoute) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = '/login';
  //   return NextResponse.redirect(url);
  // }

  // Only check anonymous status for dashboard routes (not for root or auth routes)
  if (user && isDashboardRoute) {
    try {
      // Get the user's metadata to check if they're anonymous
      const { data: userData, error } = await supabase
        .from('users')
        .select('is_anonymous')
        .eq('id', user.id)
        .single();

      // If we couldn't determine user status or user is anonymous, redirect to the onboarding page
      if (error || userData?.is_anonymous === true) {
        console.log('Redirecting anonymous user from dashboard:', user.id);
        const url = request.nextUrl.clone();
        url.pathname = '/';  // Redirect to homepage
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Error checking user anonymous status:', error);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!
  return supabaseResponse
}

/**
 * Middleware to handle Supabase authentication and temporary sessions
 */
export async function middleware(req: NextRequest) {
  return updateSession(req);
}
