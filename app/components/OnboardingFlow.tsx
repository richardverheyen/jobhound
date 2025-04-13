'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import JobCreateForm from './JobCreateForm';
import DefaultResumeWidget from './DefaultResumeWidget';
import { Resume } from '@/types';

// Define steps in the onboarding flow
enum OnboardingStep {
  INITIALIZE = 0,
  JOB_DETAILS = 1,
  RESUME_UPLOAD = 2,
  ACCOUNT_CREATION = 3
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.INITIALIZE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for tracking user and job data
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  
  // Account creation form fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  // Create anonymous user on component mount
  useEffect(() => {
    const createAnonymousUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Call handle_new_anon_user through an RPC
        const { data, error } = await supabase.rpc('create_new_anonymous_user');
        
        if (error) {
          console.error('Error with create_new_anonymous_user RPC:', error);
          throw new Error(`Failed to create anonymous user: ${error.message}`);
        }
        
        if (!data || !data.user_id || !data.email || !data.password) {
          throw new Error('Invalid response from user creation service');
        }
        
        console.log('Anonymous user created successfully:', { userId: data.user_id });
        setAnonymousUserId(data.user_id);
          
        // Sign in with the anonymous user credentials that were created
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
          
        if (signInError) {
          console.error('Error signing in as anonymous user:', signInError);
          throw new Error(`Failed to sign in: ${signInError.message}`);
        }
          
        // Move to first actual step after initialization
        setCurrentStep(OnboardingStep.JOB_DETAILS);
      } catch (error: any) {
        console.error('Error in anonymous user creation flow:', error);
        setError(error.message || 'Failed to initialize session. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    createAnonymousUser();
  }, []);
  
  // Handle job creation success
  const handleJobCreated = (createdJobId: string) => {
    setJobId(createdJobId);
    setCurrentStep(OnboardingStep.RESUME_UPLOAD);
  };
  
  // Handle resume upload/view
  const handleResumeView = (resume: Resume) => {
    setResumeId(resume.id);
  };
  
  const handleResumeCreate = (createdResumeId?: string) => {
    if (createdResumeId) {
      setResumeId(createdResumeId);
    }
  };
  
  // Proceed to account creation step after resume is uploaded
  const handleProceedToAccount = () => {
    if (!resumeId) {
      setError('Please upload a resume first');
      return;
    }
    
    setCurrentStep(OnboardingStep.ACCOUNT_CREATION);
    setError(null);
  };
  
  // Create user account from anonymous account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validate inputs
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }
    
    try {
      if (!anonymousUserId) {
        throw new Error('Session lost. Please start over.');
      }
      
      console.log('Converting anonymous user to regular account:', {
        anonymousUserId,
        email: email.trim()
      });
      
      // Convert anonymous user to regular user
      const { data: conversionData, error: conversionError } = await supabase.rpc(
        'convert_anonymous_user',
        {
          p_anonymous_user_id: anonymousUserId,
          p_email: email.trim(),
          p_full_name: fullName.trim()
        }
      );
      
      if (conversionError) {
        console.error('Error converting anonymous user:', conversionError);
        throw new Error(`Account conversion failed: ${conversionError.message}`);
      }
      
      if (!conversionData || !conversionData.success) {
        const errorMsg = conversionData?.error || 'Unknown error during account conversion';
        console.error('Conversion unsuccessful:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('User converted successfully, updating password');
      
      // Update the auth user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });
      
      if (passwordError) {
        console.error('Error updating password:', passwordError);
        throw new Error(`Failed to set password: ${passwordError.message}`);
      }
      
      console.log('Password updated, signing in with new credentials');
      
      // Sign in with the new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      
      if (signInError) {
        console.error('Error signing in with new credentials:', signInError);
        throw new Error(`Failed to sign in with new account: ${signInError.message}`);
      }
      
      // Use the job ID from state or from the conversion response
      const redirectJobId = jobId || conversionData.job_id;
      
      if (!redirectJobId) {
        throw new Error('No job found to analyze. Please try again.');
      }
      
      console.log('Account creation successful, redirecting to job page');
      
      // Success! Redirect to the job details page
      router.push(`/dashboard/jobs/${redirectJobId}`);
      
    } catch (error: any) {
      console.error('Error creating account:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show loading state while initializing anonymous user
  if (isLoading && currentStep === OnboardingStep.INITIALIZE) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Initializing your session...</p>
      </div>
    );
  }
  
  // Show helpful error message if initialization failed
  if (error && currentStep === OnboardingStep.INITIALIZE) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">Initialization Error</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {/* Progress indicator */}
      <div className="px-6 pt-6">
        <div className="relative">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
            <div 
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            ></div>
          </div>
          <div className="flex text-sm justify-between -mt-2">
            <div 
              className={`z-10 flex items-center justify-center w-8 h-8 rounded-full 
                ${currentStep >= OnboardingStep.JOB_DETAILS ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              1
            </div>
            <div 
              className={`z-10 flex items-center justify-center w-8 h-8 rounded-full 
                ${currentStep >= OnboardingStep.RESUME_UPLOAD ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              2
            </div>
            <div 
              className={`z-10 flex items-center justify-center w-8 h-8 rounded-full 
                ${currentStep >= OnboardingStep.ACCOUNT_CREATION ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              3
            </div>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className={currentStep === OnboardingStep.JOB_DETAILS ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
              Job Information
            </span>
            <span className={currentStep === OnboardingStep.RESUME_UPLOAD ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
              Resume Upload
            </span>
            <span className={currentStep === OnboardingStep.ACCOUNT_CREATION ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
              Create Account
            </span>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && currentStep !== OnboardingStep.INITIALIZE && (
        <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Step content */}
      <div className="p-6">
        {/* Step 1: Job Information using JobCreateForm */}
        {currentStep === OnboardingStep.JOB_DETAILS && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Try JobHound: Enter Job Details
            </h2>
            <JobCreateForm 
              onSuccess={handleJobCreated} 
              navigateToJobOnSuccess={false} 
            />
          </div>
        )}
        
        {/* Step 2: Resume Upload using DefaultResumeWidget */}
        {currentStep === OnboardingStep.RESUME_UPLOAD && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Upload Your Resume
            </h2>
            
            <DefaultResumeWidget 
              user={{ id: anonymousUserId || '' }}
              onViewResume={handleResumeView}
              onCreateResume={handleResumeCreate}
            />
            
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep(OnboardingStep.JOB_DETAILS)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back
              </button>
              
              <button
                onClick={handleProceedToAccount}
                disabled={!resumeId}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Create Scan
                <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Create Account */}
        {currentStep === OnboardingStep.ACCOUNT_CREATION && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Create Your Account
            </h2>
            
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-blue-500 mr-2 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Ready to analyze your resume</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Your job and resume have been temporarily saved. Create an account to analyze your resume against the job description and save your data.
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 8 characters
                </p>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Creating Account...' : 'Create Account & Analyze Resume'}
              </button>
            </form>
            
            <div className="mt-6">
              <button
                onClick={() => setCurrentStep(OnboardingStep.RESUME_UPLOAD)}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 