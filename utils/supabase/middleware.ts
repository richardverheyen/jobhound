import { createServerClient } from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // This hook enables us to set cookies inside of middleware
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // Update the request headers
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('cookie', request.cookies.toString())
          // Update the request with the new headers
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          // Set cookies on the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          // This hook enables us to delete cookies inside of middleware
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          // Update the request headers
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('cookie', request.cookies.toString())
          // Update the request with the new headers
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          // Delete the cookie from the response
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh the session
  await supabase.auth.getUser()

  return response
} 