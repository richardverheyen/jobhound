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
  
  let authSuccess = false;
  let userId = null;

  if (code) {
    // Handle OAuth code exchange
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      authSuccess = true;
      userId = data.user.id;
    }
  } else if (token_hash && type) {
    // Handle email OTP verification
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error && data.user) {
      authSuccess = true;
      userId = data.user.id;
    }
  }

  // If authentication was successful, ensure user record exists in our users table
  if (authSuccess && userId) {
    try {
      // Check if user record already exists in our custom users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      // If user doesn't exist in our custom table, create a record
      if (!existingUser) {
        // Get user email from the auth user
        const { data: userData } = await supabase.auth.getUser();
        const email = userData?.user?.email;
        
        // Insert the user record
        await supabase
          .from('users')
          .insert([{
            id: userId,
            email: email
          }]);
        
        console.log(`Created user record for ${email} with ID ${userId}`);
      }
      
      return NextResponse.redirect(new URL(next, request.url));
    } catch (error) {
      console.error('Error creating user record:', error);
      // Continue to dashboard even if record creation fails
      // We could redirect to an error page instead if preferred
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Redirect to error page if authentication failed
  return NextResponse.redirect(new URL('/auth/error?message=Authentication+failed', request.url))
} 