'use client';

import { Resume } from '@/types';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';

// Dynamically import PDF viewer components to ensure they only run on client
const FullPDFViewer = dynamic(() => import('./FullPDFViewer'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-2"></div>
      <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF viewer...</p>
    </div>
  ) 
});

interface ResumeViewDialogProps {
  resume: Resume | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumeViewDialog({ resume, isOpen, onClose }: ResumeViewDialogProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Small delay to ensure the viewer has time to load
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!resume) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" />
        <Dialog.Content 
          className="fixed z-50 w-full max-w-4xl p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transition-all"
        >
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
              {resume.filename}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                aria-label="Close"
              >
                <Cross2Icon className="h-6 w-6" />
              </button>
            </Dialog.Close>
          </div>
          
          <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden" style={{ height: '70vh' }}>
            {loading && (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {resume.file_url && !loading && (
              <FullPDFViewer fileUrl={resume.file_url} />
            )}

            {!resume.file_url && !loading && (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-500 dark:text-gray-400">
                  Preview not available for this file.
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 mt-4 rounded-b-lg flex justify-end space-x-3">
            <a
              href={resume.file_url || '#'} 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              download={resume.filename}
            >
              Download
            </a>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 