'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import JobCreateForm from './JobCreateForm';

interface JobCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (jobId: string) => void;
  navigateToJobOnSuccess?: boolean;
}

export default function JobCreateDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  navigateToJobOnSuccess = true 
}: JobCreateDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" />
        <Dialog.Content 
          className="fixed z-50 w-full max-w-lg p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transition-all overflow-y-auto max-h-[90vh]"
        >
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
              Add New Job
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

          <JobCreateForm 
            onSuccess={onSuccess}
            navigateToJobOnSuccess={navigateToJobOnSuccess}
            onCancel={onClose}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 