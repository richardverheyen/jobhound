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

  if (!user && !request.nextUrl.pathname.match("/") && !request.nextUrl.pathname.startsWith('/auth')) {
    // No user, redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user exists and is trying to access dashboard, check if they're anonymous
  if (user && isDashboardRoute) {
    try {
      // Get the user's metadata to check if they're anonymous
      const { data: userData, error } = await supabase
        .from('users')
        .select('is_anonymous')
        .eq('id', user.id)
        .single();

      // If user is anonymous, redirect to the onboarding page
      if (userData?.is_anonymous === true) {
        const url = request.nextUrl.clone();
        url.pathname = '/';  // Redirect to homepage/onboarding
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
