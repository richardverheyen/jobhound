import { NextRequest, NextResponse } from 'next/server'
import { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  // Get onboarding job_id and resume_id from URL params if present
  const onboardingJobId = requestUrl.searchParams.get('onboarding_job_id')
  const onboardingResumeId = requestUrl.searchParams.get('onboarding_resume_id')

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
      // Extract metadata from user object - ensure we get the Google profile data
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || null;
      const avatarUrl = user.user_metadata?.avatar_url || null;
      
      if (!displayName || !avatarUrl) {
        console.warn('Missing profile data from Google OAuth - displayName or avatarUrl not found in user metadata');
      }
      
      // Check if this user exists in the public.users table
      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('is_anonymous, display_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (userCheckError && userCheckError.code === 'PGRST116') {
        // User doesn't exist in the users table yet, so insert them
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            is_anonymous: false,
            display_name: displayName,
            avatar_url: avatarUrl
          });
          
        if (insertError) {
          console.error('Error creating user record:', insertError);
        } else {
          console.log('Successfully created user record with Google profile data:', user.id);
        }
      } else if (!userCheckError) {
        // User exists, update their record with latest metadata from OAuth
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
          console.log('Successfully updated user profile with Google data:', user.id);
        }
      }
      
      // Redirect to the job page if we have an onboarding job ID
      if (onboardingJobId) {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/jobs/${onboardingJobId}`);
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