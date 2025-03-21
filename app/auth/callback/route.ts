import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  const supabase = await createClient()

  if (code) {
    // Handle OAuth code exchange
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  } else if (token_hash && type) {
    // Handle email OTP verification
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Redirect to error page if authentication failed
  return NextResponse.redirect(new URL('/auth/error?message=Authentication+failed', request.url))
} 