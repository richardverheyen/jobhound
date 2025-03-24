'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Resume } from '@/types';
import { supabase } from '@/supabase/client';
import { Navbar } from '@/app/components/Navbar';
import ResumeModal from '@/app/components/ResumeModal';
import { getResumeUrl, deleteResume } from '@/app/utils/resumeUtils';

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultResumeId, setDefaultResumeId] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    getUser();
  }, []);

  useEffect(() => {
    const fetchResumes = async () => {
      setLoading(true);
      try {
        // Get user profile to find default resume ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: userData } = await supabase
          .from('users')
          .select('default_resume_id')
          .eq('id', user.id)
          .single();
          
        if (userData?.default_resume_id) {
          setDefaultResumeId(userData.default_resume_id);
        }
        
        // Fetch all user's resumes
        const { data: resumesData, error } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching resumes:', error);
          return;
        }
        
        // Process and get URLs for resumes
        const processedResumes = await Promise.all(resumesData.map(async (resume) => {
          let resumeWithUrl = {
            ...resume,
            is_default: resume.id === userData?.default_resume_id
          };
          
          // If resume has a file_path, get the URL
          if (resume.file_path) {
            // Try to use existing URL first
            if (resume.file_url) {
              resumeWithUrl.file_url = resume.file_url;
            } else {
              // Try multiple methods to get a working URL
              try {
                // First try to get a public URL
                const { data: publicUrlData } = await supabase
                  .storage
                  .from('resumes')
                  .getPublicUrl(resume.file_path);
                  
                if (publicUrlData?.publicUrl) {
                  resumeWithUrl.file_url = publicUrlData.publicUrl;
                }
              } catch (urlErr) {
                console.warn('Error getting public URL:', urlErr);
              }
              
              // If public URL failed, try signed URL
              if (!resumeWithUrl.file_url) {
                try {
                  const { data: fileData, error: fileError } = await supabase
                    .storage
                    .from('resumes')
                    .createSignedUrl(resume.file_path, 60 * 60); // 1 hour expiry
                    
                  if (fileError) {
                    console.warn('Signed URL error:', fileError);
                  } else if (fileData) {
                    resumeWithUrl.file_url = fileData.signedUrl;
                  }
                } catch (signedErr) {
                  console.warn('Error creating signed URL:', signedErr);
                }
              }
              
              // If both methods failed, use a direct path-based URL
              if (!resumeWithUrl.file_url) {
                console.warn('No file URL generated for resume, using path-based URL');
                resumeWithUrl.file_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${resume.file_path}`;
              }
            }
          }
          
          return resumeWithUrl;
        }));
        
        setResumes(processedResumes);
      } catch (error) {
        console.error('Error fetching resumes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResumes();
  }, []);

  const handleSetDefault = async (id: string) => {
    try {
      // Call the Supabase function to set default resume
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Call the Supabase function to set default resume
      const { data, error } = await supabase.rpc('set_default_resume', {
        p_user_id: user.id,
        p_resume_id: id
      });
      
      if (error) {
        console.error('Error setting default resume:', error);
        return;
      }
      
      // Update local state to reflect the change
      setDefaultResumeId(id);
      setResumes(prev => 
        prev.map(resume => ({
          ...resume,
          is_default: resume.id === id
        }))
      );
    } catch (error) {
      console.error('Error setting default resume:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Find the resume to get its file path
      const resumeToDelete = resumes.find(r => r.id === id);
      if (!resumeToDelete) return;
      
      // Delete the resume and its file
      const result = await deleteResume(
        supabase,
        id,
        resumeToDelete.file_path
      );
      
      if (!result.success) {
        console.error('Error deleting resume:', result.error);
        return;
      }
      
      // Update local state
      const updatedResumes = resumes.filter(resume => resume.id !== id);
      setResumes(updatedResumes);
      
      // If the default resume was deleted, update the default
      if (id === defaultResumeId && updatedResumes.length > 0) {
        const newDefaultId = updatedResumes[0].id;
        await handleSetDefault(newDefaultId);
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
    }
  };

  const openResumeModal = (resume: Resume) => {
    setSelectedResume(resume);
    setModalOpen(true);
  };

  const closeResumeModal = () => {
    setModalOpen(false);
    setSelectedResume(null);
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-grow px-4 py-8">
        <div className="max-w-7xl mx-auto">
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

              {loading ? (
                <div className="flex justify-center py-10">
                  <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : resumes.length === 0 ? (
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
                              {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : 'Unknown date'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <button 
                          onClick={() => openResumeModal(resume)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          data-testid={`view-resume-${resume.id}`}
                        >
                          View
                        </button>
                        {!resume.is_default && (
                          <button 
                            onClick={() => handleSetDefault(resume.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-medium rounded text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600"
                            data-testid={`set-default-${resume.id}`}
                          >
                            Set as Default
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(resume.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-gray-600"
                          data-testid={`delete-resume-${resume.id}`}
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
        </div>
      </main>
      
      <ResumeModal 
        resume={selectedResume}
        isOpen={modalOpen}
        onClose={closeResumeModal}
      />
    </div>
  );
} 