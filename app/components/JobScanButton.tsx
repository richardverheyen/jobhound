'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { Job, Resume } from '@/types';
import { createScan } from '@/app/lib/scanService';
import { Button, Link, Spinner } from '@radix-ui/themes';

interface JobScanButtonProps {
  job: Job;
  resumes: Resume[];
  onScanComplete?: () => void;
}

export default function JobScanButton({ 
  job, 
  resumes,
  onScanComplete 
}: JobScanButtonProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleScan = async () => {

    const defaultResume = resumes.find((r: Resume) => r.is_default);

    if (!defaultResume) {
      setError('No default resume found. Please upload a resume first.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await createScan({
        jobId: job.id,
        resumeId: defaultResume.id
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
      setLoading(false);
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
    <button
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
      onClick={handleScan}
      disabled={loading}
    >
      {loading && <Spinner size="1" />}
      Scan with Default Resume
    </button>
  );
} 