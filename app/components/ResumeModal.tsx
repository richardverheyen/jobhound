'use client';

import { Resume } from '@/types';
import { useState, useEffect } from 'react';

interface ResumeModalProps {
  resume: Resume | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumeModal({ resume, isOpen, onClose }: ResumeModalProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Small delay to ensure the iframe has time to load
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen || !resume) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ease-out"
          onClick={onClose}
          aria-hidden="true"
          style={{ opacity: isOpen ? 1 : 0 }}
        ></div>

        {/* Modal panel */}
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-out sm:my-8 sm:align-middle sm:max-w-4xl w-full"
          style={{ 
            transform: isOpen ? 'translateY(0)' : 'translateY(50px)', 
            opacity: isOpen ? 1 : 0
          }}
        >
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {resume.filename}
                  </h3>
                  <button
                    onClick={onClose}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden" style={{ height: '70vh' }}>
                  {loading && (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  
                  {resume.file_url && (
                    <object 
                      data={resume.file_url}
                      type="application/pdf"
                      className="w-full h-full"
                      style={{ display: loading ? 'none' : 'block' }}
                    >
                      <div className="flex justify-center items-center h-full">
                        <p className="text-gray-500 dark:text-gray-400">
                          Unable to display PDF. <a href={resume.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Click here</a> to download.
                        </p>
                      </div>
                    </object>
                  )}

                  {!resume.file_url && !loading && (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-gray-500 dark:text-gray-400">
                        Preview not available for this file.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <a
              href={resume.file_url || '#'} 
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              download={resume.filename}
            >
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 