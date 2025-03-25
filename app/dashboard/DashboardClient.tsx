'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Resume } from '@/types';
import ResumeModal from '@/app/components/ResumeModal';
import CreateResumeModal from '@/app/components/CreateResumeModal';
import CreateJobModal from '@/app/components/CreateJobModal';

interface DashboardClientProps {
  user: User;
  defaultResume: Resume | null;
  jobGoal: number;
  jobsFound: number;
  creditData: any;
}

export default function DashboardClient({ 
  user, 
  defaultResume, 
  jobGoal, 
  jobsFound,
  creditData
}: DashboardClientProps) {
  // Modal state management
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [resumeModalOpen, setResumeModalOpen] = useState<boolean>(false);
  const [createResumeModalOpen, setCreateResumeModalOpen] = useState<boolean>(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState<boolean>(false);
  
  // Use effect to attach the empty state action handler to window
  useEffect(() => {
    // @ts-ignore - Adding a custom function to window
    window.openJobModal = openCreateJobModal;
    
    return () => {
      // @ts-ignore - Cleanup
      delete window.openJobModal;
    };
  }, []);

  // Resume view modal functions
  const openResumeModal = (resume: Resume) => {
    setSelectedResume(resume);
    setResumeModalOpen(true);
  };
  
  const closeResumeModal = () => {
    setSelectedResume(null);
    setResumeModalOpen(false);
  };
  
  // Create resume modal functions
  const openCreateResumeModal = () => {
    setCreateResumeModalOpen(true);
  };
  
  const closeCreateResumeModal = () => {
    setCreateResumeModalOpen(false);
  };
  
  const handleResumeCreated = async (resumeId: string) => {
    // Refresh the page to update the data
    window.location.reload();
  };
  
  // Create job modal functions
  const openCreateJobModal = () => {
    setCreateJobModalOpen(true);
  };
  
  const closeCreateJobModal = () => {
    setCreateJobModalOpen(false);
  };
  
  const handleJobCreated = async (jobId: string) => {
    // Refresh the page to update the data
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Default Resume */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Default Resume</h2>
          <Link href="/dashboard/resumes" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
            Manage Resumes
          </Link>
        </div>

        {defaultResume ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg className="h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {defaultResume.filename}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Uploaded {defaultResume.created_at ? new Date(defaultResume.created_at).toLocaleDateString() : 'Unknown date'}
                </p>
              </div>
              <div>
                <button
                  onClick={() => openResumeModal(defaultResume)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <svg className="mx-auto h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Upload a resume to enhance your job matching.
            </p>
            <div className="mt-4">
              <button
                onClick={openCreateResumeModal}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-1.5 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Upload Resume
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Job Search Goal */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Job Search Goal</h2>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Progress: {jobsFound} of {jobGoal} jobs</span>
            <span>{Math.round((jobsFound / jobGoal) * 100)}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${Math.min(100, Math.round((jobsFound / jobGoal) * 100))}%` }}
            ></div>
          </div>
        </div>
        
        <form action="/api/user/update-goal" method="POST" className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Adjust goal:</span>
          <input 
            type="number" 
            name="jobGoal" 
            min="1" 
            defaultValue={jobGoal}
            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button 
            type="submit"
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Save
          </button>
        </form>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Setting daily job search goals helps you stay organized and motivated. We recommend applying to 5-10 quality jobs per day.
        </p>
      </div>

      {/* Credit Usage */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6" data-testid="credit-section">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Credit Usage</h2>
        
        <div className="space-y-3">
          {creditData?.recent_usage && creditData.recent_usage.length > 0 ? (
            creditData.recent_usage.map((usage: any) => (
              <div key={usage.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {usage.job_title ? `Scan for ${usage.job_title}` : 'Scan'} on {usage.created_at ? new Date(usage.created_at).toLocaleDateString() : 'Unknown date'}
                  {usage.match_score ? <span className="ml-2 text-blue-600">({usage.match_score}%)</span> : ''}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">-1 credit</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2" data-testid="no-credit-usage">
              No credit usage yet. Credits are used when scanning your resume against job listings.
            </p>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Credits</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="available-credits">{creditData?.available_credits || 0}</span>
          </div>
          
          <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span data-testid="total-purchased">Total purchased: {creditData?.total_purchased || 0}</span>
            <span data-testid="total-used">Total used: {creditData?.total_used || 0}</span>
          </div>
          
          <div className="mt-3">
            <Link 
              href="/dashboard/credits/buy"
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              data-testid="buy-credits-button"
            >
              Buy Credits
            </Link>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <ResumeModal 
        resume={selectedResume}
        isOpen={resumeModalOpen}
        onClose={closeResumeModal}
      />
      
      <CreateResumeModal 
        isOpen={createResumeModalOpen} 
        onClose={closeCreateResumeModal} 
        onSuccess={handleResumeCreated} 
      />
      
      <CreateJobModal 
        isOpen={createJobModalOpen} 
        onClose={closeCreateJobModal} 
        onSuccess={handleJobCreated} 
        navigateToJobOnSuccess={false} 
      />
      
      {/* This button provides a way for the server component to trigger the create job modal */}
      <button 
        id="create-job-button"
        className="hidden"
        onClick={openCreateJobModal}
      />
    </div>
  );
} 