import { createClient } from '@/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
}

export async function GET() {
  return await POST(new Request(''))
} 