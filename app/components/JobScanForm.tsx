'use client';

import { useState, useEffect } from 'react';
import { Resume, Job } from '@/types';
import { supabase } from '@/supabase/client';
import ResumeCreateButton from './ResumeCreateButton';
import { createScan } from '@/app/lib/scanService';
import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';

interface JobScanFormProps {
  job: Job;
  resumes: Resume[];
  onScanComplete: () => void;
  user: any;
}

export default function JobScanForm({ 
  job, 
  resumes, 
  onScanComplete,
  user
}: JobScanFormProps) {
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showResumeUploadModal, setShowResumeUploadModal] = useState(false);
  
  // Set default resume on component mount
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      // Try to find the default resume first
      const defaultResume = resumes.find(r => r.is_default);
      
      if (defaultResume) {
        setSelectedResumeId(defaultResume.id);
      } else if (user?.default_resume_id) {
        // If no resume is marked as default, try user's default_resume_id
        const userDefaultResume = resumes.find(r => r.id === user.default_resume_id);
        if (userDefaultResume) {
          setSelectedResumeId(userDefaultResume.id);
        } else {
          // Otherwise just use the first resume
          setSelectedResumeId(resumes[0].id);
        }
      } else {
        // Otherwise just use the first resume
        setSelectedResumeId(resumes[0].id);
      }
    }
  }, [resumes, user, selectedResumeId]);
  
  // Effect to watch for "upload_new" selection and open modal immediately
  useEffect(() => {
    if (selectedResumeId === 'upload_new') {
      setShowResumeUploadModal(true);
      setSelectedResumeId(null);
    }
  }, [selectedResumeId]);
  
  const handleScan = async () => {
    if (!selectedResumeId || selectedResumeId === 'upload_new') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const resume = resumes.find(r => r.id === selectedResumeId);
      
      if (!resume) {
        throw new Error('Resume not found');
      }

      const result = await createScan({
        jobId: job.id,
        resumeId: selectedResumeId
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create scan. Please try again.');
      }
      
      // If we have a pending scan, update the UI immediately
      if (result.pendingScan) {
        onScanComplete();
      }
      
      // Start polling for updates
      startPolling(result.scanId as string);
    } catch (error: any) {
      console.error('Scan error:', error);
      setError(error.message || 'Failed to create scan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a polling function to check scan status
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const startPolling = (scanId: string) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Start a new polling interval
    const interval = setInterval(async () => {
      try {
        const { data: scanData, error } = await supabase
          .from('job_scans')
          .select('*')
          .eq('id', scanId)
          .single();
          
        if (error) {
          console.error('Error polling for scan status:', error);
          clearInterval(interval);
          return;
        }
        
        if (scanData) {
          // If the scan status has changed, update the UI
          if (scanData.status === 'completed' || scanData.status === 'error') {
            // Call onScanComplete to refresh the scan list
            onScanComplete();
            // Stop polling
            clearInterval(interval);
            setPollingInterval(null);
          } else {
            // For status 'processing', also update the UI
            onScanComplete();
          }
        }
      } catch (err) {
        console.error('Error during polling:', err);
      }
    }, 2000); // Poll every 2 seconds
    
    setPollingInterval(interval);
  };
  
  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);
  
  const handleResumeCreated = async (resumeId: string) => {
    // Select the newly created resume
    setSelectedResumeId(resumeId);
    setShowResumeUploadModal(false);
    
    // Trigger refetch of resumes
    const { data: resumesData, error: resumesError } = await supabase
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!resumesError && resumesData) {
      // This would ideally update the resumes prop in the parent
      // For now, we'll just proceed with the scan using the selected resumeId
      setTimeout(() => {
        handleScan(); // Auto-scan with the newly uploaded resume
      }, 500);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Compare Resume to Job Listing</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Select Resume
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <Select.Root 
              value={selectedResumeId || ''} 
              onValueChange={(value) => setSelectedResumeId(value || null)}
              disabled={isLoading}
            >
              <Select.Trigger 
                className="inline-flex items-center justify-between w-full md:w-64 rounded px-3 py-2 text-sm gap-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                aria-label="Select a resume"
              >
                <Select.Value placeholder="Select a resume" />
                <Select.Icon>
                  <ChevronDownIcon />
                </Select.Icon>
              </Select.Trigger>
              
              <Select.Portal>
                <Select.Content 
                  className="overflow-hidden bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                  position="popper"
                  sideOffset={5}
                >
                  <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 cursor-default">
                    <ChevronUpIcon />
                  </Select.ScrollUpButton>
                  
                  <Select.Viewport className="p-1">
                    {resumes.length === 0 && (
                      <Select.Item value="" disabled className="text-sm py-2 px-4 text-gray-500 outline-none">
                        <Select.ItemText>No resumes available</Select.ItemText>
                      </Select.Item>
                    )}
                    
                    {resumes.map((resume) => (
                      <Select.Item 
                        key={resume.id} 
                        value={resume.id}
                        className="text-sm py-2 px-4 rounded-sm outline-none flex items-center cursor-default data-[highlighted]:bg-blue-100 data-[highlighted]:text-blue-900 dark:data-[highlighted]:bg-gray-700"
                      >
                        <Select.ItemText>
                          {resume.filename}
                          {resume.is_default ? ' (Default)' : ''}
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                    
                    <Select.Item 
                      value="upload_new"
                      className="text-sm py-2 px-4 rounded-sm outline-none flex items-center cursor-default data-[highlighted]:bg-blue-100 data-[highlighted]:text-blue-900 dark:data-[highlighted]:bg-gray-700 border-t border-gray-200 dark:border-gray-700 mt-1 text-blue-600 dark:text-blue-400"
                    >
                      <Select.ItemText>Upload New Resume</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                  
                  <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 cursor-default">
                    <ChevronDownIcon />
                  </Select.ScrollDownButton>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            
            <button
              onClick={handleScan}
              disabled={!selectedResumeId || isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Compare Resume to Job'
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
      
      {showResumeUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Upload New Resume</h3>
            <ResumeCreateButton 
              onSuccess={handleResumeCreated}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              buttonText="Upload Resume"
            />
            <button 
              onClick={() => setShowResumeUploadModal(false)}
              className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 