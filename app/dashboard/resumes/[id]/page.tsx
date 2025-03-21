'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Resume, JobScan } from '@/app/types';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface ResumeDetailPageProps {
  params: {
    id: string;
  };
}

export default function ResumeDetailPage({ params }: ResumeDetailPageProps) {
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [scans, setScans] = useState<JobScan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        // Get user data
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        // Get user profile to check default resume ID
        const { data: userData } = await supabase
          .from('users')
          .select('default_resume_id')
          .eq('id', user.id)
          .single();
        
        // Fetch resume details
        const { data: resumeData, error: resumeError } = await supabase
          .from('resumes')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single();
        
        if (resumeError) {
          console.error('Error fetching resume:', resumeError);
          setError('Resume not found or you do not have permission to view it.');
          setIsLoading(false);
          return;
        }
        
        const isDefaultResume = userData?.default_resume_id === params.id;
        
        // Fetch any job scans that used this resume
        const { data: scansData } = await supabase
          .from('job_scans')
          .select(`
            *,
            jobs:job_id (
              id,
              title,
              company
            )
          `)
          .eq('resume_id', params.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        setResume({
          ...resumeData,
          is_default: isDefaultResume
        });
        setIsDefault(isDefaultResume);
        setScans(scansData || []);
      } catch (error) {
        console.error('Error fetching resume data:', error);
        setError('An error occurred while loading the resume data.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [params.id, router]);

  const handleSetDefault = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !resume) return;
      
      // Call Supabase function to set default resume
      const { data, error } = await supabase.rpc('set_default_resume', {
        p_user_id: user.id,
        p_resume_id: resume.id
      });
      
      if (error) {
        console.error('Error setting default resume:', error);
        return;
      }
      
      setIsDefault(true);
      setResume({
        ...resume,
        is_default: true
      });
    } catch (error) {
      console.error('Error setting resume as default:', error);
    }
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h3 className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</h3>
        <div className="mt-6">
          <Link
            href="/dashboard/resumes"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Resumes
          </Link>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="text-center py-10">
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Resume not found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The resume you're looking for doesn't exist or has been deleted.</p>
        <div className="mt-6">
          <Link
            href="/dashboard/resumes"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Resumes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Resume Details</h1>
        <div className="flex space-x-2">
          <Link
            href="/dashboard/resumes"
            className="text-blue-600 hover:text-blue-500"
          >
            Back to Resumes
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Resume details */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  Resume Information
                  {isDefault && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                      Default
                    </span>
                  )}
                </h2>
              </div>
              
              <div className="flex">
                <Link
                  href="/dashboard/resumes/new"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Replace
                </Link>
              </div>
            </div>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-center mb-4">
                <svg className="h-16 w-16 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Filename</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{resume.filename}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">File Size</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatFileSize(resume.file_size)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Format</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{resume.mime_type?.split('/')[1].toUpperCase() || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Uploaded</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                {resume.file_url && (
                  <a
                    href={resume.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    View Resume
                  </a>
                )}
              </div>
            </div>
            
            {!isDefault && (
              <div className="mt-4">
                <button
                  onClick={handleSetDefault}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-md text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Set as Default Resume
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Right column: Job Scans */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Job Scan History</h2>
            
            {scans.length === 0 ? (
              <div className="text-center py-10 border border-gray-200 dark:border-gray-700 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No scans yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This resume hasn't been used for any job scans yet.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/jobs"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Scan Against a Job
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Job
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Match
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">View</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {scans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {scan.jobs?.company || 'Unknown Company'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {scan.jobs?.title || 'Unknown Position'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {scan.match_score ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              scan.match_score >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              scan.match_score >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                            }`}>
                              {scan.match_score}%
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            scan.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                            scan.status === 'Failed' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {scan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/jobs/${scan.job_id}`}
                            className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 