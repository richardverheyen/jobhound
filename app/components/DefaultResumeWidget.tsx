'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Resume, User } from '@/types';
import { supabase } from '@/supabase/client';
import DirectResumeUpload from './DirectResumeUpload';
import dynamic from 'next/dynamic';

// Dynamically import PDF viewer components to ensure they only run on client
const PDFViewer = dynamic(() => import('./PDFViewer'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
      <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF viewer...</p>
    </div>
  ) 
});

interface DefaultResumeWidgetProps {
  user: User | null;
  defaultResumeId?: string;
  onViewResume: (resume: Resume) => void;
  onCreateResume: (resumeId?: string) => void;
}

export default function DefaultResumeWidget({ 
  user, 
  defaultResumeId,
  onViewResume, 
  onCreateResume 
}: DefaultResumeWidgetProps) {
  const [defaultResume, setDefaultResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Function to fetch the default resume
  const fetchDefaultResume = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First determine which resume ID to use
      let resumeId = defaultResumeId;
      
      // If no resume ID provided, try to get it from the user object
      if (!resumeId && user?.default_resume_id) {
        resumeId = user.default_resume_id;
      }
      
      console.log('DefaultResumeWidget fetching resume with ID:', resumeId);
      console.log('User data:', user);
      
      // If we have a resume ID, fetch the resume
      if (resumeId) {
        const { data: resumeData, error } = await supabase
          .from('resumes')
          .select('*')
          .eq('id', resumeId)
          .single();
        
        if (error) {
          console.error('Error fetching default resume:', error);
          console.error('Resume ID used:', resumeId);
          setDefaultResume(null);
          setLoading(false);
          return;
        }
        
        // Add some logging for debugging
        console.log('Resume data fetched:', resumeData);
        
        // If resume has a file_path, get the signed URL
        if (resumeData && resumeData.file_path) {
          const { data: fileData, error: fileError } = await supabase
            .storage
            .from('resumes')
            .createSignedUrl(resumeData.file_path, 60 * 60); // 1 hour expiry
            
          if (fileError) {
            console.error('Error getting signed URL:', fileError);
          } else if (fileData) {
            resumeData.file_url = fileData.signedUrl;
          }
        }
        
        setDefaultResume(resumeData);
      } else {
        console.log('No resume ID available to fetch default resume');
        setDefaultResume(null);
      }
    } catch (error) {
      console.error('Error in fetchDefaultResume:', error);
      setDefaultResume(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch default resume when the component mounts or when user/defaultResumeId changes
  useEffect(() => {
    fetchDefaultResume();
  }, [user, defaultResumeId]);

  // Handle resume creation success
  const handleResumeCreated = (resumeId: string, signedUrl?: string) => {
    console.log('Resume created with ID:', resumeId);
    
    if (signedUrl) {
      console.log('Resume signed URL received:', signedUrl);
      // Create a temporary resume object with the data we already have
      const tempResume: Resume = {
        id: resumeId,
        file_url: signedUrl,
        filename: 'Uploaded Resume.pdf',
        user_id: user?.id || '',
        file_path: '',
        created_at: new Date().toISOString()
      };
      
      // Set it as the current resume without refetching
      setDefaultResume(tempResume);
      
      // Notify parent component
      onCreateResume(resumeId);
    } else {
      // If we don't have a signed URL, we need to fetch the resume data
      // Notify parent component
      onCreateResume(resumeId);
      
      // Fetch the updated resume data
      fetchDefaultResume();
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Default Resume</h2>
          <Link href="/dashboard/resumes" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
            Manage Resumes
          </Link>
        </div>
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-scroll">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Default Resume</h2>
        <Link href="/dashboard/resumes" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
          Manage Resumes
        </Link>
      </div>

      {defaultResume && defaultResume.file_url ? (
        <PDFViewer 
          fileUrl={defaultResume.file_url} 
          onClick={() => onViewResume(defaultResume)}
        />
      ) : (
        <div className="text-center py-6">
          <svg className="mx-auto h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload a resume to enhance your job matching.
          </p>
          <div className="mt-4">
            <DirectResumeUpload 
              onSuccess={handleResumeCreated}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              buttonText="Upload Resume"
            />
          </div>
        </div>
      )}
    </div>
  );
} 