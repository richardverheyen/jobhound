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
    
    // Get the authenticated user and session token for later use
    const { data: { user } } = await supabase.auth.getUser()
    const sessionToken = authData?.session?.access_token
    
    if (user) {
      console.log('User:', JSON.stringify({user}));
      console.log('providers:', JSON.stringify(user?.app_metadata.providers));
      console.log('identities:', JSON.stringify(user?.identities));

      console.log('User metadata:', JSON.stringify(user.user_metadata))
      
      // Extract metadata from user object
      let displayName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.user_metadata?.user_name || 
                        null;
      let avatarUrl = user.user_metadata?.avatar_url || 
                      user.user_metadata?.picture || 
                      null;
      
      // If profile data not found in metadata, check identities array
      if ((!displayName || !avatarUrl) && user.identities && user.identities.length > 0) {
        // Find Google identity
        const googleIdentity = user.identities.find(identity => identity.provider === 'google');
        
        if (googleIdentity && googleIdentity.identity_data) {
          console.log('Found Google identity data:', googleIdentity.identity_data);
          
          // Extract data from identity
          displayName = displayName || 
                        googleIdentity.identity_data.full_name || 
                        googleIdentity.identity_data.name || 
                        null;
          
          avatarUrl = avatarUrl || 
                      googleIdentity.identity_data.avatar_url || 
                      googleIdentity.identity_data.picture || 
                      null;
          
          // Update user metadata with this information
          if (displayName || avatarUrl) {
            try {
              const updateData: Record<string, any> = {};
              if (displayName) updateData.full_name = displayName;
              if (avatarUrl) updateData.avatar_url = avatarUrl;
              
              const { error: updateError } = await supabase.auth.updateUser({
                data: updateData
              });
              
              if (updateError) {
                console.error('Error updating user with identity data:', updateError);
              } else {
                console.log('Successfully updated user metadata with identity data');
              }
            } catch (err) {
              console.error('Error in updating user with identity data:', err);
            }
          }
        }
      }
      
      // If we still don't have the Google profile data in metadata, try updating the user
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
                         displayName;
            avatarUrl = updatedUser.user.user_metadata?.avatar_url || 
                        updatedUser.user.user_metadata?.picture || 
                        avatarUrl;
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
        // Instead of trying to create the scan here, pass the resumeId as a parameter
        // The client will handle creating the scan using the createScan lib
        console.log("Passing resume ID to job page for scan:", onboardingResumeId);
        
        // Redirect to the job page with pendingScan parameter
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/jobs/${onboardingJobId}?pendingScan=${onboardingResumeId}`);
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