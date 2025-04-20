'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase, signOut } from '@/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/supabase/server';
import { Button } from '@radix-ui/themes';

export function Navbar({ user }: { user: any | null }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside menus to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      <div className="relative container mx-auto px-4 py-3 h-[60px]">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-end space-x-2">
              <Image
                src="/logo.png"
                alt="JobHound Logo"
                className="h-14 w-auto bottom-0 absolute"
              />
              <span className="text-xl pl-12 font-bold text-gray-900 dark:text-white">
                JobHound
              </span>
            </Link>
            
            {/* Desktop Navigation */}
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
                {/* Desktop User Menu */}
                <div className="hidden md:block relative" ref={userMenuRef}>
                  <Button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                  >
                    {user.user_metadata?.avatar_url && (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="h-8 w-8 rounded-full"
                      />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <svg
                      className={`h-4 w-4 text-gray-400 transition-transform ${isUserMenuOpen ? 'transform rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="py-1" role="menu">
                        <Button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          role="menuitem"
                        >
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Menu Button */}
                <Button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </Button>
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

        {/* Mobile Navigation */}
        {isMobileMenuOpen && user && (
          <div className="md:hidden mt-4" ref={mobileMenuRef}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/dashboard"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/jobs"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Jobs
              </Link>
              <Link
                href="/dashboard/resumes"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Resumes
              </Link>
              <Button
                onClick={() => {
                  handleSignOut();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 