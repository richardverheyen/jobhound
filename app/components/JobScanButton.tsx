'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { Resume, Job } from '@/types';
import { createScan } from '@/app/lib/scanService';
import { Button } from '@radix-ui/themes';

interface JobScanButtonProps {
  job: Job;
  user: any;
  onScanComplete?: () => void;
}

export default function JobScanButton({ 
  job, 
  user,
  onScanComplete 
}: JobScanButtonProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultResumeId, setDefaultResumeId] = useState<string | undefined>(undefined);
  
  // Fetch user's default resume on component mount
  useEffect(() => {
    const fetchDefaultResume = async () => {
      try {
        // First try to get resume marked as default
        const { data: defaultResumes, error: defaultError } = await supabase
          .from('resumes')
          .select('id')
          .eq('is_default', true)
          .limit(1);
        
        if (!defaultError && defaultResumes && defaultResumes.length > 0) {
          setDefaultResumeId(defaultResumes[0].id);
          return;
        }
        
        // If no resume is marked as default, try user's default_resume_id
        if (user?.default_resume_id) {
          const { data: userDefaultResume, error: userDefaultError } = await supabase
            .from('resumes')
            .select('id')
            .eq('id', user.default_resume_id)
            .limit(1);
            
          if (!userDefaultError && userDefaultResume && userDefaultResume.length > 0) {
            setDefaultResumeId(userDefaultResume[0].id);
            return;
          }
        }
        
        // Otherwise just use the most recently created resume
        const { data: resumes, error: resumesError } = await supabase
          .from('resumes')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!resumesError && resumes && resumes.length > 0) {
          setDefaultResumeId(resumes[0].id);
        }
      } catch (error) {
        console.error('Error fetching default resume:', error);
      }
    };
    
    fetchDefaultResume();
  }, [user]);
  
  const handleScan = async () => {
    if (!defaultResumeId) {
      alert('No resume found. Please upload a resume first.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createScan({
        jobId: job.id,
        resumeId: defaultResumeId
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create scan. Please try again.');
      }
      
      // If we have a pending scan, update the UI immediately
      if (result.pendingScan) {
        if (onScanComplete) onScanComplete();
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
            if (onScanComplete) onScanComplete();
            // Stop polling
            clearInterval(interval);
            setPollingInterval(null);
          } else {
            // For status 'processing', also update the UI
            if (onScanComplete) onScanComplete();
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

  return (
    <Button
      onClick={handleScan}
      disabled={isLoading || !defaultResumeId}
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
        'Scan with Default Resume'
      )}
    </Button>
  );
} 