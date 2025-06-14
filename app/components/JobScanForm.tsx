'use client';

import { useState, useEffect } from 'react';
import { Resume, Job } from '@/types';
import { supabase } from '@/supabase/client';
import ResumeCreateButton from './ResumeCreateButton';
import { createScan } from '@/app/lib/scanService';
import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';

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
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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
        } else if (resumes[0]) {
          // Otherwise just use the first resume
          setSelectedResumeId(resumes[0].id);
        }
      } else if (resumes[0]) {
        // Otherwise just use the first resume
        setSelectedResumeId(resumes[0].id);
      }
    }
  }, [resumes, user, selectedResumeId]);
  
  // Handle select change
  const handleSelectChange = (value: string) => {
    if (value === 'upload_new') {
      // Don't update the selected value
      // The file input will be triggered by the click on Upload New Resume
      return;
    }
    setSelectedResumeId(value);
  };
  
  const handleScan = async () => {
    if (!selectedResumeId) return;
    
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
  
  // Helper to get resume filename by id
  const getResumeFilename = (resumeId: string) => {
    const resume = resumes.find(r => r.id === resumeId);
    if (resume) {
      return resume.is_default ? `${resume.filename} (Default)` : resume.filename;
    }
    return 'Select a resume';
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
            {resumes.length > 0 ? (
              <>
                <Select.Root 
                  value={selectedResumeId}
                  onValueChange={handleSelectChange}
                  disabled={isLoading}
                >
                  <Select.Trigger 
                    className="inline-flex items-center justify-between w-full md:w-64 rounded px-3 py-2 text-sm gap-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    aria-label="Select a resume"
                  >
                    <Select.Value>
                      {selectedResumeId ? getResumeFilename(selectedResumeId) : 'Select a resume'}
                    </Select.Value>
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
                          onSelect={(e) => {
                            e.preventDefault();
                            document.getElementById('resume-file-input')?.click();
                          }}
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
                
                {/* Hidden ResumeCreateButton */}
                <div className="hidden">
                  <ResumeCreateButton 
                    onSuccess={handleResumeCreated}
                    buttonText="Upload Resume"
                  />
                </div>
                
                {/* Custom file input that will be triggered when Upload New Resume is selected */}
                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      // Trigger click on the actual ResumeCreateButton's file input
                      const fileInput = document.querySelector('[data-testid="direct-resume-file-input"]') as HTMLInputElement;
                      if (fileInput) {
                        // Copy the selected file to the ResumeCreateButton's file input
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(e.target.files[0]);
                        fileInput.files = dataTransfer.files;
                        
                        // Trigger change event on the file input
                        const changeEvent = new Event('change', { bubbles: true });
                        fileInput.dispatchEvent(changeEvent);
                      }
                      // Clear the value to allow selecting the same file again
                      e.target.value = '';
                    }
                  }}
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">No resumes available.</span>
                <ResumeCreateButton 
                  onSuccess={handleResumeCreated}
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  buttonText="Upload a resume"
                />
              </div>
            )}
            
            <Button
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
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 