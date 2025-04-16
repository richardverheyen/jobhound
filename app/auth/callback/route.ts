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
      console.log('User:', {user})
      console.log('User metadata:', JSON.stringify(user.user_metadata))
      
      // Extract metadata from user object
      let displayName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.user_metadata?.user_name || 
                        null;
      let avatarUrl = user.user_metadata?.avatar_url || null;
      
      // If we don't have the Google profile data in metadata yet, try updating the user
      // This helps with identity linking where profile data might not be in metadata
      if (!displayName || !avatarUrl) {
        // First, try to update the user metadata to get all Google profile data
        try {
          const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
            data: { 
              requesting_google_data: true 
            }
          })
          
          if (updateError) {
            console.error('Error updating user to refresh metadata:', updateError)
          } else if (updatedUser) {
            console.log('Updated user metadata:', JSON.stringify(updatedUser.user.user_metadata))
            // Try to extract the data again after the update
            displayName = updatedUser.user.user_metadata?.full_name || 
                         updatedUser.user.user_metadata?.name || 
                         updatedUser.user.user_metadata?.user_name || 
                         null;
            avatarUrl = updatedUser.user.user_metadata?.avatar_url || null;
          }
        } catch (err) {
          console.error('Error in metadata update process:', err)
        }
      }
      
      if (!displayName || !avatarUrl) {
        console.warn('Still missing profile data after trying to update - displayName or avatarUrl not found')
      } else {
        console.log('Successfully retrieved profile data:', { displayName, avatarUrl })
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
      
      // Check if we have both job ID and resume ID from onboarding flow
      if (onboardingJobId && onboardingResumeId) {
        try {
          // Trigger scan creation directly from API
          const apiUrl = `${requestUrl.origin}/api/create-scan`;
          console.log("Triggering automatic scan via API for job:", onboardingJobId, "and resume:", onboardingResumeId);
          
          // Get a fresh access token for the API call
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData?.session?.access_token) {
            // Call the API to create the scan
            const scanResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${sessionData.session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                jobId: onboardingJobId,
                resumeId: onboardingResumeId
              })
            });
            
            if (scanResponse.ok) {
              const scanResult = await scanResponse.json();
              console.log("Automatic scan created successfully:", scanResult);
            } else {
              console.error("Failed to create automatic scan:", await scanResponse.text());
            }
          } else {
            console.error("No valid session found for creating scan");
          }
        } catch (scanError) {
          console.error("Error triggering automatic scan:", scanError);
          // Continue with redirect even if scan creation fails
        }
        
        // Redirect to the job page
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/jobs/${onboardingJobId}`);
      } else if (onboardingJobId) {
        // If we only have job ID but no resume ID, just redirect to the job page
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