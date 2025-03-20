import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = cookies()
  const supabase = await createClient()

  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_BASE_URL), {
    status: 302,
  })
}

export async function GET() {
  return await POST()
} 