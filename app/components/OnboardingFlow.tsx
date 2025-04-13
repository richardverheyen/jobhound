'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import JobCreateFormFast from './JobCreateFormFast';
import ResumeViewDefault from './ResumeViewDefault';
import { Resume } from '@/types';

// Define steps in the onboarding flow
enum OnboardingStep {
  INITIALIZE = 0,
  IN_PROGRESS = 1,
  COMPLETE = 2
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
  
  // Progress bar state
  const [progressWidth, setProgressWidth] = useState('0%');
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const [scanningResume, setScanningResume] = useState(false);

  // Update progress width when job or resume changes or on button hover
  useEffect(() => {
    if (isHoveringButton && jobId && resumeId) {
      setProgressWidth('100%');
    } else if (jobId && resumeId) {
      setProgressWidth('66%');
    } else if (jobId || resumeId) {
      setProgressWidth('33%');
    } else {
      setProgressWidth('0%');
    }
  }, [jobId, resumeId, isHoveringButton]);

  // Create anonymous user on component mount
  useEffect(() => {
    const signInAnonymously = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use Supabase's built-in anonymous sign-in
        const { data, error } = await supabase.auth.signInAnonymously();
        
        if (error) {
          console.error('Error with anonymous sign-in:', error);
          throw new Error(`Failed to create anonymous user: ${error.message}`);
        }
        
        if (!data.user) {
          throw new Error('Failed to create anonymous user: No user returned');
        }
        
        console.log('Anonymous user created successfully:', { userId: data.user.id });
        setAnonymousUserId(data.user.id);
        
        // Move to in-progress step after initialization
        setCurrentStep(OnboardingStep.IN_PROGRESS);
      } catch (error: any) {
        console.error('Error in anonymous user creation flow:', error);
        setError(error.message || 'Failed to initialize session. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    signInAnonymously();
  }, []);
  
  // Handle job creation success
  const handleJobCreated = (createdJobId: string) => {
    setJobId(createdJobId);
  };
  
  // Handle resume upload/view
  const handleResumeView = (resume: Resume) => {
    console.log('Resume viewed:', resume);
    setResumeId(resume.id);
  };
  
  const handleResumeCreate = (createdResumeId?: string, signedUrl?: string) => {
    if (createdResumeId) {
      console.log('Resume created with ID:', createdResumeId);
      if (signedUrl) {
        console.log('Resume signed URL received:', signedUrl);
      }
      setResumeId(createdResumeId);
    }
  };
  
  // Initiate OAuth identity linking process
  const handleScanResume = async () => {
    if (!resumeId) {
      setError('Please upload a resume first');
      return;
    }
    
    setScanningResume(true);
    setError(null);
    
    try {
      // Store the job ID in localStorage so we can access it after OAuth redirect
      if (jobId) {
        localStorage.setItem('onboarding_job_id', jobId);
      }
      
      // Start the Google OAuth identity linking process
      // Use the linkIdentity method as per Supabase docs for anonymous sign-ins
      const { data, error } = await supabase.auth.linkIdentity({ 
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('Error starting identity linking:', error);
        throw new Error(`Failed to start identity linking: ${error.message}`);
      }
      
      // The OAuth flow will redirect the user to Google's login page
      // and then back to our callback URL after authentication
      console.log('Starting Google OAuth flow for identity linking');
      
    } catch (error: any) {
      console.error('Error linking identity:', error);
      setError(error.message || 'Failed to start authentication. Please try again.');
      setScanningResume(false);
    }
  };
  
  // Create user account from anonymous account - used for email/password signup
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
      // Use the updateUser method to convert anonymous user to a permanent user
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email: email.trim(),
        data: { full_name: fullName.trim() }
      });
      
      if (updateError) {
        console.error('Error updating user email:', updateError);
        throw new Error(`Failed to update email: ${updateError.message}`);
      }
      
      // Wait for user to click the email verification link or enter OTP
      // For this demo, we'll show a message and assume they've verified
      console.log('Email verification sent, waiting for user to verify...');
      
      // In production, you'd handle email verification here, perhaps by
      // redirecting to a verification page or showing a verification UI
      // For this demo, we'll simulate verification by directly updating password
      
      // Update the user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });
      
      if (passwordError) {
        console.error('Error updating password:', passwordError);
        throw new Error(`Failed to set password: ${passwordError.message}`);
      }
      
      // Get the most recent job ID for redirect
      let redirectJobId = jobId;
      
      if (!redirectJobId) {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('id')
          .eq('user_id', anonymousUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (jobError) {
          console.error('Error fetching job ID:', jobError);
        } else if (jobData) {
          redirectJobId = jobData.id;
        }
      }
      
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
              style={{ width: progressWidth }} 
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${scanningResume ? 'bg-green-500' : 'bg-blue-500'} transition-all duration-300 ease-in-out`}
            ></div>
          </div>
          <div className="flex justify-between -mt-2">
            <div className="flex flex-col items-center">
              <div 
                className={`z-10 flex items-center justify-center w-8 h-8 rounded-full 
                  ${jobId ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
                  transition-colors duration-300`}
              >
                1
              </div>
              <span className={`text-xs mt-1 ${jobId ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Job Information
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              <div 
                className={`z-10 flex items-center justify-center w-8 h-8 rounded-full 
                  ${resumeId ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
                  transition-colors duration-300`}
              >
                2
              </div>
              <span className={`text-xs mt-1 ${resumeId ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Resume Upload
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              {/* Replaced the number 3 with scan button */}
              <button
                onClick={handleScanResume}
                disabled={!jobId || !resumeId || scanningResume}
                onMouseEnter={() => jobId && resumeId && setIsHoveringButton(true)}
                onMouseLeave={() => setIsHoveringButton(false)}
                className={`z-10 flex items-center justify-center rounded-md px-3 py-1 ${
                  jobId && resumeId 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                } transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`}
              >
                <span className="relative">
                  Scan Resume
                  {scanningResume && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-white absolute animate-ping opacity-75"></span>
                    </span>
                  )}
                </span>
              </button>
              <span className={`text-xs mt-1 ${jobId && resumeId ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Scan Resume
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && currentStep !== OnboardingStep.INITIALIZE && (
        <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Two column layout for desktop, single column for mobile */}
      <div className="p-6">
        {currentStep === OnboardingStep.IN_PROGRESS && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Job Information */}
            <div className="flex flex-col bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Job Details
              </h2>
              <JobCreateFormFast
                onSuccess={handleJobCreated} 
                navigateToJobOnSuccess={false} 
              />
              {jobId && (
                <div className="mt-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-100 dark:border-green-800">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Job details saved successfully!
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Column 2: Resume Upload */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Your Resume
              </h2>
              <ResumeViewDefault 
                  user={{ id: anonymousUserId || '' }}
                  defaultResumeId={resumeId || undefined}
                  onViewResume={handleResumeView}
                  onCreateResume={handleResumeCreate}
                  showManageButton={false}
                  preventRefresh={scanningResume}
              />
              
              {resumeId && (
                <div className="mt-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-100 dark:border-green-800">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Resume uploaded successfully!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Enter your job details and upload your resume, then click "Scan Resume" to analyze your resume against the job description. You'll sign in with Google to save your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 