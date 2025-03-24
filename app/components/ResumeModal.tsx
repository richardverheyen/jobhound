'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Resume } from '@/types';
import ResumeViewer from './ResumeViewer';
import { getResumeUrl } from '@/app/utils/resumeUtils';
import { supabase } from '@/supabase/client';

interface ResumeModalProps {
  resume: Resume | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumeModal({ resume, isOpen, onClose }: ResumeModalProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Get download URL when resume changes
  useEffect(() => {
    const getDownloadUrl = async () => {
      if (!resume || !resume.file_path) return;
      
      try {
        const url = await getResumeUrl(supabase, resume.file_path, resume.file_url);
        setDownloadUrl(url);
      } catch (err) {
        console.error('Error getting download URL:', err);
      }
    };
    
    if (isOpen && resume) {
      getDownloadUrl();
    }
  }, [resume, isOpen]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                >
                  {resume?.filename}
                </Dialog.Title>
                
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Uploaded {resume?.created_at ? new Date(resume.created_at).toLocaleDateString() : 'Unknown date'}
                  </p>
                </div>

                <div className="mt-4 h-[70vh]">
                  <ResumeViewer 
                    resume={resume} 
                    className="w-full h-full"
                  />
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={resume?.filename || "resume.pdf"}
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      Download
                    </a>
                  )}
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 dark:bg-blue-900 px-4 py-2 text-sm font-medium text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 