'use client';

import { useState, useEffect } from 'react';
import { Resume, Job } from '@/types';
import { supabase } from '@/supabase/client';
import CreateResumeModal from './CreateResumeModal';

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
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [createResumeModalOpen, setCreateResumeModalOpen] = useState<boolean>(false);
  
  // Effect to watch for "upload_new" selection and open modal immediately
  useEffect(() => {
    if (selectedResumeId === 'upload_new') {
      setCreateResumeModalOpen(true);
    }
  }, [selectedResumeId]);
  
  // Handle resume scan
  const handleScan = async () => {
    if (!selectedResumeId || selectedResumeId === 'upload_new') return;
    
    setIsScanning(true);
    
    try {
      // Get the resume filename for display purposes
      const resume = resumes.find(r => r.id === selectedResumeId);
      
      // Create a new scan record
      const { data: scanData, error: scanError } = await supabase.rpc('create_job_scan', {
        p_user_id: user.id,
        p_job_id: job?.id,
        p_resume_id: selectedResumeId,
        p_resume_filename: resume?.filename || 'Unknown',
        p_job_posting: job?.description || ''
      });
      
      if (scanError) {
        console.error('Error creating scan:', scanError);
        alert('Failed to create scan. Please try again.');
      } else {
        // Call the onScanComplete callback to refresh data
        onScanComplete();
      }
    } catch (error) {
      console.error('Error in handleScan:', error);
    } finally {
      setIsScanning(false);
    }
  };
  
  // Create resume modal functions
  const openCreateResumeModal = () => {
    setCreateResumeModalOpen(true);
  };
  
  const closeCreateResumeModal = () => {
    setCreateResumeModalOpen(false);
    // Reset dropdown selection if the modal is closed without creating a resume
    if (selectedResumeId === 'upload_new') {
      setSelectedResumeId('');
    }
  };
  
  const handleResumeCreated = async (resumeId: string) => {
    // Select the newly created resume
    setSelectedResumeId(resumeId);
    onScanComplete(); // Refresh resume list
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Compare Resume to Job</h2>
      
      <div className="space-y-4 sm:space-y-0">
        <div className="sm:flex sm:items-center sm:space-x-4">
          <div className="flex-grow mb-4 sm:mb-0">
            <label htmlFor="resume" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Resume
            </label>
            <select
              id="resume"
              name="resume"
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a resume</option>
              {resumes.map(resume => (
                <option key={resume.id} value={resume.id}>
                  {resume.filename} {resume.is_default ? '(Default)' : ''}
                </option>
              ))}
              <option value="upload_new" className="font-medium text-blue-600 dark:text-blue-400">
                + Upload New Resume
              </option>
            </select>
          </div>
          
          <div className="flex-shrink-0 self-end">
            <button
              onClick={handleScan}
              disabled={!selectedResumeId || selectedResumeId === 'upload_new' || isScanning}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Scan Resume'
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Resume Upload Modal */}
      <CreateResumeModal
        isOpen={createResumeModalOpen}
        onClose={closeCreateResumeModal}
        onSuccess={handleResumeCreated}
      />
    </div>
  );
} 