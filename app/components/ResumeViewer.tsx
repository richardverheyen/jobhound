import { useState, useEffect } from 'react';
import { Resume } from '@/types';
import { supabase } from '@/supabase/client';
import { getResumeUrl } from '@/app/utils/resumeUtils';

interface ResumeViewerProps {
  resume: Resume | null;
  className?: string;
}

export default function ResumeViewer({ resume, className = '' }: ResumeViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUrl = async () => {
      setLoading(true);
      setError(null);
      
      if (!resume || !resume.file_path) {
        setLoading(false);
        setError('No resume file available');
        return;
      }
      
      try {
        // Use our utility function to get the best URL
        const fileUrl = await getResumeUrl(supabase, resume.file_path, resume.file_url);
        
        if (!fileUrl) {
          setError('Could not generate a valid URL for this resume');
        } else {
          setUrl(fileUrl);
        }
      } catch (err: any) {
        console.error('Error getting resume URL:', err);
        setError(err.message || 'Failed to load resume');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUrl();
  }, [resume]);
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !url) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
        <svg
          className="h-12 w-12 text-red-400 mb-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {error || 'Unable to display resume'}
        </p>
        {resume?.file_path && (
          <a
            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${resume.file_path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-sm text-blue-600 hover:text-blue-500"
          >
            Try direct download
          </a>
        )}
      </div>
    );
  }
  
  return (
    <div className={className}>
      <iframe
        src={url}
        className="w-full h-full border-0"
        title={resume?.filename || 'Resume Viewer'}
      />
    </div>
  );
} 