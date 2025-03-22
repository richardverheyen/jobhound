'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, signOut } from '@/supabase/client';

export function Navbar({ user }: { user: any | null }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            JobHound
          </Link>
          {user && (
            <nav className="hidden md:flex space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Dashboard
              </Link>
              <Link href="/dashboard/jobs" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Jobs
              </Link>
              <Link href="/dashboard/resumes" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Resumes
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/auth/login" className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                Login
              </Link>
              <Link href="/auth/signup" className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 