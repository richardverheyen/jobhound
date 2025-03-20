'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('message') || 'Sorry, something went wrong'

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Authentication Error
      </h1>
      
      <div className="mx-auto w-16 h-16 mb-6 text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        {error}
      </p>
      
      <div className="space-y-4">
        <Link
          href="/auth/login"
          className="inline-block px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Return to login
        </Link>
      </div>
    </div>
  )
}

// Fallback content while the component is loading
function ErrorFallback() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Authentication Error
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Loading error details...
      </p>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<ErrorFallback />}>
      <ErrorContent />
    </Suspense>
  )
}