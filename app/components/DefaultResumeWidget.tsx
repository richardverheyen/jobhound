'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Resume, User } from '@/types';
import { supabase } from '@/supabase/client';
import DirectResumeUpload from './DirectResumeUpload';
import PDFViewer from './PDFViewer';

// Change this to true to display two pages side by side
const SHOW_TWO_PAGES = false;

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

  useEffect(() => {
    if (!user) return;

    const fetchDefaultResume = async () => {
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

    fetchDefaultResume();
  }, [user, defaultResumeId]);

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
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Default Resume</h2>
        <Link href="/dashboard/resumes" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
          Manage Resumes
        </Link>
      </div>

      {defaultResume ? (
        <PDFViewer 
          resume={defaultResume} 
          onView={() => onViewResume(defaultResume)}
          showTwoPages={SHOW_TWO_PAGES}
        />
      ) : (
        <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No default resume</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Upload a resume to enhance your job matching experience
          </p>
          <div className="mt-6">
            <DirectResumeUpload 
              onSuccess={(resumeId) => onCreateResume(resumeId)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              buttonText="Upload Resume"
            />
          </div>
        </div>
      )}
    </div>
  );
} 