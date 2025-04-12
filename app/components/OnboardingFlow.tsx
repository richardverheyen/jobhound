'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';

// Define the type for scan preview
interface ScanPreview {
  matchScore: number;
  keywordMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  education: number;
  recommendations: string[];
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Anonymous user state
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  
  // Step 1: Job information
  const [jobTitle, setJobTitle] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  
  // Step 2: Resume upload
  const [resumeName, setResumeName] = useState<string>('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // Step 3: Account creation
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  // Create anonymous user on component mount
  useEffect(() => {
    const createAnonymousUser = async () => {
      try {
        setIsLoading(true);
        
        // Generate a fingerprint based on browser/device information
        const generateFingerprint = () => {
          const userAgent = navigator.userAgent;
          const screenData = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const language = navigator.language;
          
          // Create a simple fingerprint - for production, use a more robust solution
          const fingerprint = btoa(
            `${userAgent}|${screenData}|${timezone}|${language}|${Date.now().toString().substring(0, 8)}`
          ).substring(0, 64);
          
          return fingerprint;
        };
        
        const fingerprint = generateFingerprint();
        
        // Check if we already have a stored anonymous user ID in localStorage
        const storedUserId = localStorage.getItem('anonymousUserId');
        if (storedUserId) {
          // Verify if this user ID is still valid
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, is_anonymous, anonymous_expires_at')
            .eq('id', storedUserId)
            .eq('is_anonymous', true)
            .single();
            
          if (!userError && userData && new Date(userData.anonymous_expires_at) > new Date()) {
            // We have a valid anonymous user, use it
            setAnonymousUserId(userData.id);
            setIsLoading(false);
            return;
          }
          // Invalid or expired user, remove from localStorage and continue
          localStorage.removeItem('anonymousUserId');
        }
        
        // Create a new anonymous user with fingerprint
        const { data, error } = await supabase.rpc('create_anonymous_user', {
          p_client_fingerprint: fingerprint
        });
        
        if (error) {
          throw error;
        }
        
        if (data && data.user_id) {
          setAnonymousUserId(data.user_id);
          // Store the ID in localStorage to help avoid creating multiple
          localStorage.setItem('anonymousUserId', data.user_id);
        }
      } catch (error: any) {
        console.error('Error creating anonymous user:', error);
        setError('Failed to initialize. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    createAnonymousUser();
  }, []);
  
  const handleNextStep = async () => {
    // Validate current step
    if (currentStep === 1) {
      if (!jobTitle.trim() || !company.trim() || !jobDescription.trim()) {
        setError('Please fill in all job information fields');
        return;
      }
      
      // Create job if moving from step 1 to 2
      try {
        setIsLoading(true);
        
        if (!anonymousUserId) {
          setError('Session not initialized. Please refresh and try again.');
          return;
        }
        
        // Save job to database
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .insert({
            user_id: anonymousUserId,
            title: jobTitle,
            company: company,
            description: jobDescription
          })
          .select()
          .single();
          
        if (jobError) {
          throw jobError;
        }
        
        if (jobData) {
          setJobId(jobData.id);
        }
      } catch (error: any) {
        console.error('Error saving job:', error);
        setError('Failed to save job. Please try again.');
        return;
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 2) {
      if (!resumeFile) {
        setError('Please upload a resume');
        return;
      }
    }
    
    // If validation passes, move to next step
    setCurrentStep(prev => prev + 1);
    setError(null);
  };
  
  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    setError(null);
  };
  
  const handleResumeFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check if file is a PDF
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        setResumeFile(null);
        return;
      }
      
      // Check file size (limit to 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit.');
        setResumeFile(null);
        return;
      }
      
      setResumeFile(selectedFile);
      setError(null);
      
      // Use the filename as the default name if not provided
      if (!resumeName) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setResumeName(fileName);
      }
    }
  };
  
  const handleResumeUpload = async () => {
    if (!resumeFile || !anonymousUserId) {
      setError('Please upload a resume file');
      return false;
    }
    
    try {
      setIsLoading(true);
      setUploadProgress(0);
      
      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${resumeFile.name.replace(/\s+/g, '_')}`;
      const filePath = `${anonymousUserId}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, resumeFile, {
          cacheControl: '3600',
          upsert: false,
          // TypeScript doesn't recognize this property, but it's supported by Supabase
          ...(
            {
              onUploadProgress: (progress: { loaded: number; total: number }) => {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                setUploadProgress(percent);
              }
            } as any
          )
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrlData } = await supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);
      
      // Create resume record in database
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .insert({
          user_id: anonymousUserId,
          name: resumeName || resumeFile.name.replace(/\.[^/.]+$/, ""),
          filename: resumeFile.name,
          file_path: filePath,
          file_size: resumeFile.size,
          file_url: publicUrlData?.publicUrl || null
        })
        .select()
        .single();
      
      if (resumeError) throw resumeError;
      
      if (resumeData) {
        setResumeId(resumeData.id);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      setError('Failed to upload resume. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validate inputs
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }
    
    // If resume hasn't been uploaded yet, do it now
    if (!resumeId) {
      const uploadSuccess = await handleResumeUpload();
      if (!uploadSuccess) {
        setIsLoading(false);
        return;
      }
    }
    
    try {
      if (!anonymousUserId) {
        throw new Error('Session lost. Please start over.');
      }
      
      // Convert anonymous user and set up account
      const { data: conversionData, error: conversionError } = await supabase.rpc(
        'convert_anonymous_user',
        {
          p_anonymous_user_id: anonymousUserId,
          p_email: email,
          p_full_name: fullName
        }
      );
      
      if (conversionError) throw conversionError;
      
      if (!conversionData.success) {
        throw new Error(conversionData.error || 'Failed to process your account');
      }
      
      // Update the auth user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });
      
      if (passwordError) throw passwordError;
      
      // Sign in with the new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (signInError) throw signInError;
      
      // Success! Redirect to the job details page to see the scan
      router.push(`/dashboard/jobs/${conversionData.job_id}`);
      
    } catch (error: any) {
      console.error('Error creating account:', error);
      setError(error.message || 'Failed to create account. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Show loading state while initializing anonymous user
  if (isLoading && !anonymousUserId && currentStep === 1) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Initializing...</p>
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
              style={{ width: `${(currentStep / 3) * 100}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            ></div>
          </div>
          <div className="flex text-sm justify-between -mt-2">
            <div 
              className={`z-10 flex items-center justify-center w-8 h-8 rounded-full 
                ${currentStep >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              1
            </div>
            <div 
              className={`z-10 flex items-center justify-center w-8 h-8 rounded-full 
                ${currentStep >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              2
            </div>
            <div 
              className={`z-10 flex items-center justify-center w-8 h-8 rounded-full 
                ${currentStep >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              3
            </div>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className={currentStep === 1 ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
              Job Information
            </span>
            <span className={currentStep === 2 ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
              Resume Upload
            </span>
            <span className={currentStep === 3 ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
              Create Account
            </span>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Step content */}
      <div className="p-6">
        {/* Step 1: Job Information */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Try JobHound: Enter Job Details
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Job Title *
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Software Engineer"
                />
              </div>
              
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Company *
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Acme Corporation"
                />
              </div>
              
              <div>
                <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Job Description *
                </label>
                <textarea
                  id="jobDescription"
                  rows={6}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Paste the job description here..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Copy and paste the full job description for the best results.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Resume Upload */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Upload Your Resume
            </h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="resumeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resume Name
                </label>
                <input
                  type="text"
                  id="resumeName"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., My Software Engineer Resume"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  A name to help you identify this resume.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resume File *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none px-2 py-1"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf"
                          onChange={handleResumeFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF only, up to 10MB
                    </p>
                  </div>
                </div>
                
                {resumeFile && (
                  <div className="mt-4 flex items-center text-sm text-gray-900 dark:text-gray-100">
                    <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>
                      {resumeFile.name} ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Uploading: {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Create Account */}
        {currentStep === 3 && (
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
          </div>
        )}
        
        {/* Navigation buttons */}
        <div className={`mt-8 flex ${currentStep === 3 ? 'justify-start' : 'justify-between'}`}>
          {currentStep > 1 && (
            <button
              onClick={handlePreviousStep}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
          )}
          
          {currentStep < 3 && (
            <button
              onClick={handleNextStep}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Continue'}
              <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 