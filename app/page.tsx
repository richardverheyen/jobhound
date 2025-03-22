import { createClient } from '@/supabase/server'
import { redirect } from 'next/navigation'
import Image from "next/image";
import Link from "next/link";
import { Navbar } from '@/app/components/Navbar';

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={null} />
      
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              <span className="block">JobHound</span>
              <span className="block text-blue-600">Track and optimize your job hunt</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              JobHound helps you track job applications, analyze your resume match, and improve your chances of landing your dream job.
            </p>
            <div className="mt-8 flex justify-center">
              <div className="rounded-md shadow">
                <Link href="/auth/signup" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
                  Get started
                </Link>
              </div>
              <div className="ml-3 rounded-md shadow">
                <Link href="/auth/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
                  Log in
                </Link>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Track Your Applications</h3>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                Keep all your job applications in one place. Never lose track of where you've applied again.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Resume Analysis</h3>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                See how well your resume matches job descriptions and get suggestions for improvement.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Boost Your Success</h3>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                Increase your chances of getting interviews with AI-powered insights and recommendations.
              </p>
            </div>
          </div>
          
          <div className="mt-16">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white text-center">
              Ready to transform your job search?
            </h2>
            <div className="mt-6 text-center">
              <Link href="/auth/signup" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                Start for free
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} JobHound. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
