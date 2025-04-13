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
    await supabase.auth.exchangeCodeForSession(code)
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Check if this was an anonymous user conversion (from identity linking)
      // by looking for a job they created during onboarding
      const { data: recentJob, error } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (recentJob && !error) {
        // If we found a job, redirect the user to that job's details page
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/jobs/${recentJob.id}`)
      }
    }
  }

  // URL to redirect to after sign in process completes (default behavior)
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
} 