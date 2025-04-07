'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase/client';
import { Navbar } from '@/app/components/Navbar';
import { Job, Resume } from '@/types';
import { createScan } from '@/app/lib/scanService';
import { useCreateScan } from "./createScan";

export default function NewScanPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(true);
  const [isCreatingScan, setIsCreatingScan] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // New job form state
  const [showJobForm, setShowJobForm] = useState<boolean>(false);
  const [jobFormData, setJobFormData] = useState({
    company: '',
    position: '',
    location: '',
    description: ''
  });

  // New resume form state
  const [showResumeForm, setShowResumeForm] = useState<boolean>(false);
  const [resumeName, setResumeName] = useState<string>('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Use our new scan creation hook
  const { handleCreateScan, isCreatingScan: scanIsCreatingScan, error: scanError, setError: setScanError } = useCreateScan();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchResumes();
    }
  }, [user]);

  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setJobs(data || []);
      
      // If no jobs, automatically show the job form
      if (data && data.length === 0) {
        setShowJobForm(true);
      }
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      setError('Failed to load jobs. Please try again.');
    } finally {
      setIsLoadingJobs(false);
    }
  };
  
  const fetchResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setResumes(data || []);
      
      // If user has default resume, preselect it
      if (user?.default_resume_id && data) {
        const defaultResume = data.find(resume => resume.id === user.default_resume_id);
        if (defaultResume) {
          setSelectedResume(defaultResume);
        }
      }
    } catch (error: any) {
      console.error('Error fetching resumes:', error);
      setError('Failed to load resumes. Please try again.');
    } finally {
      setIsLoadingResumes(false);
    }
  };
  
  // Job form handlers
  const handleJobChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJobFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleJobSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!user) {
        throw new Error('You must be logged in to create a job');
      }
      
      // Insert the job into Supabase
      const { data, error } = await supabase
        .from('jobs')
        .insert([
          {
            user_id: user.id,
            company: jobFormData.company,
            title: jobFormData.position,
            location: jobFormData.location,
            description: jobFormData.description
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to jobs list and select it
      if (data) {
        setJobs(prev => [data, ...prev]);
        setSelectedJob(data);
        setShowJobForm(false);
        
        // Move to step 2 if we're in step 1
        if (currentStep === 1) {
          setCurrentStep(2);
        }
      }
    } catch (error: any) {
      console.error('Error creating job:', error);
      setError(error.message || 'Failed to create job. Please try again.');
    }
  };
  
  // Resume form handlers
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
  
  const handleResumeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!resumeFile) {
      setError('Please select a file to upload.');
      return;
    }
    
    if (!resumeName.trim()) {
      setError('Please provide a name for your resume.');
      return;
    }
    
    try {
      if (!user) {
        throw new Error('You must be logged in to upload a resume');
      }
      
      const userId = user.id;
      const fileName = `${Date.now()}_${resumeFile.name.replace(/\s+/g, '_')}`;
      const filePath = `${userId}/${fileName}`;
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, resumeFile, {
          cacheControl: '3600',
          upsert: false,
          // @ts-ignore - The Supabase JS client supports onUploadProgress but type definitions are missing
          onUploadProgress: (progress: { loaded: number; total: number }) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      
      if (uploadError) throw new Error(`Error uploading file: ${uploadError.message}`);
      
      // Get the public URL
      const { data: publicUrlData } = await supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);
      
      // Call RPC function to create resume record in database
      const { data: resumeData, error: resumeError } = await supabase.rpc(
        'create_resume',
        {
          p_filename: resumeFile.name,
          p_name: resumeName,
          p_file_path: filePath,
          p_file_size: resumeFile.size,
          p_file_url: publicUrlData?.publicUrl || null,
          p_set_as_default: resumes.length === 0 // Set as default if it's the first resume
        }
      );
      
      if (resumeError) throw new Error(`Error creating resume: ${resumeError.message}`);
      
      // After successful upload, fetch resumes again and select the new one
      await fetchResumes();
      
      // Find the newly created resume
      const { data: newResumes } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (newResumes && newResumes.length > 0) {
        setSelectedResume(newResumes[0]);
      }
      
      setShowResumeForm(false);
      setResumeName('');
      setResumeFile(null);
      setUploadProgress(0);
      
      // Move to step 3 if we're in step 2
      if (currentStep === 2) {
        setCurrentStep(3);
      }
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      setError(error.message || 'Failed to upload resume. Please try again.');
      setUploadProgress(0);
    }
  };
  
  // Navigation between steps
  const goToStep = (step: number) => {
    // Validate current step before proceeding
    if (currentStep === 1 && step > 1 && !selectedJob) {
      setError('Please select or create a job first.');
      return;
    }
    
    if (currentStep === 2 && step > 2 && !selectedResume) {
      setError('Please select or upload a resume first.');
      return;
    }
    
    setCurrentStep(step);
    setError(null);
  };
  
  const handleJobSelection = (job: Job) => {
    setSelectedJob(job);
    setError(null);
  };
  
  const handleResumeSelection = (resume: Resume) => {
    setSelectedResume(resume);
    setError(null);
  };
  
  // Create scan
  const createScan = async () => {
    if (!selectedJob || !selectedResume) {
      setError('Please select both a job and a resume before creating a scan.');
      return;
    }
    
    // Use our shared error state
    if (scanError) setError(scanError);
    
    // Call the Edge Function through our hook
    const result = await handleCreateScan(
      selectedJob.id,
      selectedResume.id,
    );
    
    if (!result?.success) {
      setError(result?.error || 'Failed to create scan. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} />
      
      <main className="flex-grow px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Scan</h1>
            <Link 
              href="/dashboard"
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Back to Dashboard
            </Link>
          </div>
          
          {/* Step indicator */}
          <div className="mb-8">
            <div className="relative">
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                <div 
                  style={{ width: `${(currentStep / 3) * 100}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
              <div className="flex text-sm justify-between -mt-2">
                <div 
                  className={`z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= 1 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  } cursor-pointer`}
                  onClick={() => goToStep(1)}
                >
                  1
                </div>
                <div 
                  className={`z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= 2 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  } ${selectedJob ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  onClick={() => selectedJob && goToStep(2)}
                >
                  2
                </div>
                <div 
                  className={`z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= 3 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  } ${selectedJob && selectedResume ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  onClick={() => selectedJob && selectedResume && goToStep(3)}
                >
                  3
                </div>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className={currentStep === 1 ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                  Select Job
                </span>
                <span className={currentStep === 2 ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                  Select Resume
                </span>
                <span className={currentStep === 3 ? 'text-blue-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                  Create Scan
                </span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {/* Content for each step */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            {currentStep === 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Select a Job
                </h2>
                
                {/* Loading state */}
                {isLoadingJobs && (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                
                {/* Job selection */}
                {!isLoadingJobs && !showJobForm && (
                  <div>
                    {jobs.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          You don't have any jobs saved yet.
                        </p>
                        <button
                          onClick={() => setShowJobForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Create Your First Job
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
                          </p>
                          <button
                            onClick={() => setShowJobForm(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                          >
                            Add New Job
                          </button>
                        </div>

                        <div className="grid gap-4 mt-4">
                          {jobs.map(job => (
                            <div 
                              key={job.id}
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedJob?.id === job.id 
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                              }`}
                              onClick={() => handleJobSelection(job)}
                            >
                              <div className="flex justify-between">
                                <div>
                                  <h3 className="font-medium text-gray-900 dark:text-white">
                                    {job.title}
                                  </h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {job.company}
                                    {job.location ? ` • ${job.location}` : ''}
                                  </p>
                                </div>
                                {selectedJob?.id === job.id && (
                                  <span className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Next button */}
                    {selectedJob && (
                      <div className="mt-8 flex justify-end">
                        <button
                          onClick={() => goToStep(2)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Continue to Resume Selection
                          <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Job creation form */}
                {!isLoadingJobs && showJobForm && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Add New Job
                      </h3>
                      {jobs.length > 0 && (
                        <button
                          onClick={() => setShowJobForm(false)}
                          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    
                    <form onSubmit={handleJobSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Company
                          </label>
                          <input
                            type="text"
                            id="company"
                            name="company"
                            value={jobFormData.company}
                            onChange={handleJobChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Position
                          </label>
                          <input
                            type="text"
                            id="position"
                            name="position"
                            value={jobFormData.position}
                            onChange={handleJobChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Location
                          </label>
                          <input
                            type="text"
                            id="location"
                            name="location"
                            value={jobFormData.location}
                            onChange={handleJobChange}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Job Description
                        </label>
                        <div className="mt-1">
                          <textarea
                            id="description"
                            name="description"
                            rows={10}
                            value={jobFormData.description}
                            onChange={handleJobChange}
                            placeholder="Paste the job description here..."
                            className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          The full job description will help us analyze your resume against this job.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Save Job
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
            
            {currentStep === 2 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Select a Resume
                </h2>
                
                {/* Loading state */}
                {isLoadingResumes && (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                
                {/* Resume selection */}
                {!isLoadingResumes && !showResumeForm && (
                  <div>
                    {resumes.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          You don't have any resumes uploaded yet.
                        </p>
                        <button
                          onClick={() => setShowResumeForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Upload Your First Resume
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {resumes.length} resume{resumes.length !== 1 ? 's' : ''} found
                          </p>
                          <button
                            onClick={() => setShowResumeForm(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                          >
                            Upload New Resume
                          </button>
                        </div>

                        <div className="grid gap-4 mt-4">
                          {resumes.map(resume => (
                            <div 
                              key={resume.id}
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedResume?.id === resume.id 
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                              }`}
                              onClick={() => handleResumeSelection(resume)}
                            >
                              <div className="flex justify-between">
                                <div className="flex items-center">
                                  <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <div className="ml-3">
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                      {resume.filename}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {resume.file_size ? `${(resume.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'} • 
                                      {new Date(resume.created_at || '').toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                {selectedResume?.id === resume.id && (
                                  <span className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Navigation buttons */}
                    <div className="mt-8 flex justify-between">
                      <button
                        onClick={() => goToStep(1)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Job Selection
                      </button>
                      
                      {selectedResume && (
                        <button
                          onClick={() => goToStep(3)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Continue to Create Scan
                          <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Resume upload form */}
                {!isLoadingResumes && showResumeForm && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Upload New Resume
                      </h3>
                      {resumes.length > 0 && (
                        <button
                          onClick={() => setShowResumeForm(false)}
                          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    
                    <form onSubmit={handleResumeSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="resumeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Resume Name
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="resumeName"
                            value={resumeName}
                            onChange={(e) => setResumeName(e.target.value)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                            placeholder="e.g., Software Engineer Resume"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          A name to help you identify this resume.
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Resume File
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
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none"
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
                              <p className="pl-1 dark:text-gray-300">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              PDF only, up to 10MB
                            </p>
                            {resumeFile && (
                              <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mt-2">
                                Selected: {resumeFile.name} ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Uploading: {uploadProgress}%
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-3">
                        {resumes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowResumeForm(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Upload Resume
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
            
            {currentStep === 3 && (
              <div>
                <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
                  Create Scan
                </h2>
                
                <div className="space-y-8">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                      Selected Job
                    </h3>
                    
                    {selectedJob && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                          <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">{selectedJob.title}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedJob.company}
                            {selectedJob.location ? ` • ${selectedJob.location}` : ''}
                          </p>
                          <div className="mt-2">
                            <button
                              onClick={() => goToStep(1)}
                              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                      Selected Resume
                    </h3>
                    
                    {selectedResume && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 p-3 rounded-full">
                          <svg className="h-6 w-6 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">{selectedResume.filename}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedResume.file_size ? `${(selectedResume.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'} • 
                            {new Date(selectedResume.created_at || '').toLocaleDateString()}
                          </p>
                          <div className="mt-2">
                            <button
                              onClick={() => goToStep(2)}
                              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center mb-4">
                      <svg className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        What happens next?
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      When you click the button below, our AI will analyze your resume against the job description and generate a comprehensive report. This will help you understand how well your resume matches the job requirements and provide suggestions for improvement.
                    </p>
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
                      This process will use 1 scan credit from your account.
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => goToStep(2)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Resume Selection
                  </button>
                  
                  <button
                    onClick={createScan}
                    disabled={scanIsCreatingScan}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {scanIsCreatingScan ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Scan...
                      </>
                    ) : (
                      <>
                        Start Scan
                        <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}