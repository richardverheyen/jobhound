'use client';

import { useState, useEffect } from 'react';
import { Resume, Job } from '@/types';
import { supabase } from '@/supabase/client';
import ResumeCreateButton from './ResumeCreateButton';
import { createScan } from '@/app/lib/scanService';

interface CompareResumeToJobProps {
  job: Job;
  resumes: Resume[];
  onScanComplete: () => void;
  user: any;
}

export default function CompareResumeToJob({ 
  job, 
  resumes, 
  onScanComplete,
  user
}: CompareResumeToJobProps) {
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Effect to watch for "upload_new" selection and open modal immediately
  useEffect(() => {
    if (selectedResumeId === 'upload_new') {
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
      
      onScanComplete();
    } catch (error: any) {
      console.error('Scan error:', error);
      setError(error.message || 'Failed to create scan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
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
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Compare Resume to Job Listing</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Select Resume
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              id="resume"
              name="resume"
              value={selectedResumeId || ''}
              onChange={(e) => setSelectedResumeId(e.target.value || null)}
              className="block w-full md:w-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isLoading}
            >
              <option value="">Select a resume</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.filename}
                  {resume.is_default ? ' (Default)' : ''}
                </option>
              ))}
            </select>
            
            <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
            
            <ResumeCreateButton 
              onSuccess={handleResumeCreated}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              buttonText="Upload New"
            />
          </div>
        </div>
        
        <div className="flex-shrink-0 self-end">
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
        
        {error && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 