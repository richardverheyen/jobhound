'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';

interface CreateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (resumeId: string) => void;
}

export default function CreateResumeModal({ isOpen, onClose, onSuccess }: CreateResumeModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // Reset form when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal is closed
      setFile(null);
      setName('');
      setError(null);
      setUploadProgress(0);
    }
  }, [isOpen]);
  
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, loading]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check if file is a PDF
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        setFile(null);
        return;
      }
      
      // Check file size (limit to 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit.');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Use the filename as the default name
      if (!name) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setName(fileName);
      }
    }
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    
    if (!name.trim()) {
      setError('Please provide a name for your resume.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error(`Authentication error: ${userError.message}`);
      }
      
      if (!userData.user) {
        throw new Error('User not authenticated.');
      }
      
      const userId = userData.user.id;
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${userId}/${fileName}`;
      
      // Upload file to Supabase Storage with upsert enabled
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Allow overwriting existing files
          contentType: 'application/pdf',
          // @ts-ignore - The Supabase JS client supports onUploadProgress but the type definitions are missing
          onUploadProgress: (progress: { loaded: number; total: number }) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Error uploading file: ${uploadError.message || uploadError.name || 'Unknown storage error'}`);
      }
      
      if (!uploadData) {
        throw new Error('No data returned from storage upload');
      }
      
      // Get the public URL
      let fileUrl: string | null = null;
      
      try {
        // Try public URL first 
        const { data: publicUrlData } = await supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);
          
        fileUrl = publicUrlData?.publicUrl || null;
      } catch (urlErr) {
        console.warn('Error getting public URL:', urlErr);
        
        // If public URL failed, try signed URL
        try {
          const { data: signedUrlData } = await supabase.storage
            .from('resumes')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
            
          fileUrl = signedUrlData?.signedUrl || null;
        } catch (signedErr) {
          console.warn('Error creating signed URL:', signedErr);
        }
      }
      
      if (!fileUrl) {
        // Construct a path-based URL as last resort
        fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${filePath}`;
      }
      
      // Call RPC function to create resume record in database
      const { data: resumeData, error: resumeError } = await supabase.rpc(
        'create_resume',
        {
          p_filename: file.name,
          p_name: name,
          p_file_path: filePath,
          p_file_size: file.size,
          p_file_url: fileUrl,
          p_set_as_default: true // Set as default if it's the first resume
        }
      );
      
      if (resumeError) {
        console.error('Resume creation error:', resumeError);
        throw new Error(`Error creating resume: ${resumeError.message || resumeError.details || 'Unknown database error'}`);
      }
      
      if (resumeData?.success === false) {
        console.error('Resume function returned error:', resumeData);
        throw new Error(`Database error: ${resumeData.error || 'Unknown function error'}`);
      }
      
      // Call onSuccess with the resume ID if provided
      if (onSuccess && resumeData?.id) {
        onSuccess(resumeData.id);
      }
      
      // Close the modal
      onClose();
      
    } catch (err: any) {
      console.error('Resume upload failed:', err);
      setError(err.message || 'Error uploading resume. Please try again.');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ease-out"
          onClick={loading ? undefined : onClose}
          aria-hidden="true"
          style={{ opacity: isOpen ? 0.5 : 0 }}
        ></div>

        {/* Modal panel */}
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-out sm:my-8 sm:align-middle sm:max-w-lg w-full"
          style={{ 
            transform: isOpen ? 'translateY(0)' : 'translateY(50px)', 
            opacity: isOpen ? 1 : 0
          }}
        >
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Upload New Resume
                  </h3>
                  <button
                    onClick={loading ? undefined : onClose}
                    disabled={loading}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Resume Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        placeholder="e.g., Software Engineer Resume"
                        data-testid="resume-name-input"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      A name to help you identify this resume.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Resume File
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept=".pdf"
                              onChange={handleFileChange}
                              data-testid="resume-file-input"
                            />
                          </label>
                          <p className="pl-1 dark:text-gray-300">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PDF only, up to 10MB
                        </p>
                        {file && (
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mt-2">
                            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Uploading: {uploadProgress}%
                      </p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={loading || !file}
                      className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                        loading || !file
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      data-testid="upload-resume-button"
                    >
                      {loading ? 'Uploading...' : 'Upload Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={loading ? undefined : onClose}
                      disabled={loading}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 