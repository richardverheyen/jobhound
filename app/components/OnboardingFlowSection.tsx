'use client';

import { useState } from 'react';
import OnboardingFlow from './OnboardingFlow';

export default function OnboardingFlowSection() {
  const [startedOnboarding, setStartedOnboarding] = useState(false);
  
  if (!startedOnboarding) {
    return (
      <div className="text-center">
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Upload a job description and your resume to instantly see how well they match.
          <br />
          No account required to try it out!
        </p>
        <button
          onClick={() => setStartedOnboarding(true)}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Analyze My Resume
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden max-w-4xl mx-auto">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-blue-600 dark:text-blue-300 font-medium">
            Try JobHound's resume analysis without creating an account
          </span>
        </div>
      </div>
      <OnboardingFlow />
    </div>
  );
} 