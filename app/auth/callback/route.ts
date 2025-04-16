import { NextRequest, NextResponse } from 'next/server'
import { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (authError) {
      console.error('Error exchanging code for session:', authError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${encodeURIComponent(authError.message)}`)
    }
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Extract metadata from user object
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || null;
      const avatarUrl = user.user_metadata?.avatar_url || null;
      
      // Check if this user exists in the public.users table and update if needed
      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('is_anonymous')
        .eq('id', user.id)
        .single();
      
      if (!userCheckError && userData?.is_anonymous === true) {
        // Update the user record to mark them as non-anonymous and save metadata
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_anonymous: false,
            anonymous_expires_at: null,
            email: user.email,
            display_name: displayName,
            avatar_url: avatarUrl
          })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Error updating user after identity linking:', updateError);
        } else {
          console.log('Successfully converted anonymous user to permanent user:', user.id);
        }
      }
      
      // Check if this was an anonymous user conversion (from identity linking)
      // by looking for a job they created during onboarding
      const jobId = typeof window !== 'undefined' ? localStorage.getItem('onboarding_job_id') : null;
      
      if (jobId) {
        // If we have a stored job ID from onboarding flow, redirect to that job
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/jobs/${jobId}`);
      } else {
        // Otherwise, look up the most recent job
        const { data: recentJob, error: jobError } = await supabase
          .from('jobs')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (recentJob && !jobError) {
          // If we found a job, redirect the user to that job's details page
          return NextResponse.redirect(`${requestUrl.origin}/dashboard/jobs/${recentJob.id}`);
        }
      }
    }
  }

  // URL to redirect to after sign in process completes (default behavior)
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
} 