'use client';

import { useState } from 'react';
import { JobScan, Resume } from '@/types';
import JobScanView from './JobScanView';

interface JobScansListProps {
  scans: JobScan[];
  resumes: Resume[];
}

export default function JobScansList({ scans, resumes }: JobScansListProps) {
  // Render empty state if no scans
  if (scans.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Previous Scans</h3>
        <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No scans yet. Select a resume and click "Scan Resume" to analyze your resume against this job.
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Previous Scans</h3>
      
      <div className="space-y-6">
        {scans.map((scan) => {
          // Only show completed scans with the JobScanView component
          if (scan.status === 'completed' && scan.results) {
            return (
              <div key={scan.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {resumes.find(r => r.id === scan.resume_id)?.filename || scan.resume_filename || 'Unknown Resume'}
                      </h4>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {scan.created_at && new Date(scan.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <JobScanView scan={scan} />
              </div>
            );
          }
          
          // For non-completed scans, use the existing summary view
          const resumeName = resumes.find(r => r.id === scan.resume_id)?.filename || scan.resume_filename || 'Unknown Resume';
          
          return (
            <div key={scan.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Summary Header */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                      {scan.status === 'error' ? (
                        <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {resumeName}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {scan.created_at && new Date(scan.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Status: <span className={
                        scan.status === 'completed' ? 'text-green-500' : 
                        scan.status === 'error' ? 'text-red-500' : 
                        'text-yellow-500'
                      }>
                        {scan.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Error State */}
              {scan.status === 'error' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-red-500">
                    <p>Error: {scan.error_message || 'An error occurred during scan processing'}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 