'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Resume } from '@/app/types';

// Mocked resume data
const MOCK_RESUMES: Resume[] = [
  {
    id: '1',
    filename: 'software_developer_resume.pdf',
    file_size: 245000,
    mime_type: 'application/pdf',
    created_at: '2023-05-10T10:00:00Z',
    updated_at: '2023-05-10T10:00:00Z',
    is_default: true
  },
  {
    id: '2',
    filename: 'resume_for_frontend.pdf',
    file_size: 198000,
    mime_type: 'application/pdf',
    created_at: '2023-05-15T14:30:00Z',
    updated_at: '2023-05-15T14:30:00Z',
    is_default: false
  },
  {
    id: '3',
    filename: 'resume_updated_2023.docx',
    file_size: 175000,
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    created_at: '2023-06-01T09:15:00Z',
    updated_at: '2023-06-01T09:15:00Z',
    is_default: false
  }
];

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>(MOCK_RESUMES);
  const [defaultResumeId, setDefaultResumeId] = useState<string>(
    MOCK_RESUMES.find(resume => resume.is_default)?.id || ''
  );

  const handleSetDefault = (id: string) => {
    // This would be replaced with an actual API call
    setDefaultResumeId(id);
    
    // Update local state to reflect the change
    setResumes(prev => 
      prev.map(resume => ({
        ...resume,
        is_default: resume.id === id
      }))
    );
  };

  const handleDelete = (id: string) => {
    // This would be replaced with an actual API call
    // For now, just remove from the local state
    setResumes(prev => prev.filter(resume => resume.id !== id));
    
    // If the default resume was deleted, set a new default if available
    if (id === defaultResumeId && resumes.length > 1) {
      const remainingResumes = resumes.filter(resume => resume.id !== id);
      setDefaultResumeId(remainingResumes[0].id);
      setResumes(prev => 
        prev.filter(resume => resume.id !== id).map((resume, index) => ({
          ...resume,
          is_default: index === 0 // Set the first one as default
        }))
      );
    }
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Resumes</h1>
        <Link
          href="/dashboard/resumes/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Upload New Resume
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Upload and manage your resumes. Set one as default to use it for quick scans against job listings.
        </p>

        {resumes.length === 0 ? (
          <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No resumes yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by uploading your resume.</p>
            <div className="mt-6">
              <Link
                href="/dashboard/resumes/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Upload New Resume
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <div 
                key={resume.id} 
                className={`border ${resume.is_default ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'} rounded-lg shadow-sm p-4 relative`}
              >
                {resume.is_default && (
                  <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    Default
                  </span>
                )}
                
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                      {resume.filename}
                    </h3>
                    <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        {formatFileSize(resume.file_size)}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {new Date(resume.created_at!).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <Link 
                    href={`/dashboard/resumes/${resume.id}`}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    View
                  </Link>
                  {!resume.is_default && (
                    <button 
                      onClick={() => handleSetDefault(resume.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-medium rounded text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600"
                    >
                      Set as Default
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(resume.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-gray-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tips for Effective Resumes</h2>
        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex">
            <svg className="flex-shrink-0 h-5 w-5 text-green-500 dark:text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Tailor your resume for each job application by highlighting relevant experience
          </li>
          <li className="flex">
            <svg className="flex-shrink-0 h-5 w-5 text-green-500 dark:text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Use keywords from the job description to optimize for ATS systems
          </li>
          <li className="flex">
            <svg className="flex-shrink-0 h-5 w-5 text-green-500 dark:text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Keep your resume concise and focused on achievements rather than responsibilities
          </li>
          <li className="flex">
            <svg className="flex-shrink-0 h-5 w-5 text-green-500 dark:text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Use JobHound's scan feature to see how well your resume matches specific job descriptions
          </li>
        </ul>
      </div>
    </div>
  );
} 