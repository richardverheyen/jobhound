import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  redirect('/welcome')
}
