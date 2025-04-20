'use client';

import { JobScan, Resume } from '@/types';
import JobScanView from './JobScanView';

interface JobScansListProps {
  scans: JobScan[];
  resumes?: Resume[];
}

export default function JobScansList({ scans, resumes }: JobScansListProps) {
  // Render empty state if no scans
  if (scans.length === 0) {
    return (
      <div className="bg-[#1e2837] text-white shadow rounded-lg p-6">
        <h3 className="text-base font-medium mb-4">Previous Scans</h3>
        <div className="py-4 text-center text-sm text-gray-300">
          No scans yet. Select a resume and click "Scan Resume" to analyze your resume against this job.
        </div>
      </div>
    );
  }
  
  // Separate scans by status
  const pendingScans = scans.filter(scan => scan.status === 'pending');
  const processingScans = scans.filter(scan => scan.status === 'processing');
  const completedScans = scans.filter(scan => scan.status === 'completed' || scan.status === 'error');
  
  // Auto-expand the first scan if there's only one completed scan
  const autoExpand = completedScans.length === 1 && pendingScans.length === 0 && processingScans.length === 0;
  
  return (
    <div className="bg-[#1e2837] text-white shadow rounded-lg">
      <h3 className="text-base font-medium p-6 pb-4">Previous Scans</h3>
      <div className="space-y-6">
        {/* Pending Scans */}
        {pendingScans.map((scan) => (
          <div key={scan.id} className="border border-gray-700 mx-6 mb-6 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{scan.resume_filename}</span>
                <div className="mt-1 flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-400">Pending</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="animate-pulse text-xs text-gray-400">Preparing scan...</div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Processing Scans */}
        {processingScans.map((scan) => (
          <div key={scan.id} className="border border-gray-700 mx-6 mb-6 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{scan.resume_filename}</span>
                <div className="mt-1 flex items-center">
                  <div className="w-2 h-2 bg-blue-400 mr-2"></div>
                  <span className="text-xs text-gray-400">Processing</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Completed Scans */}
        {completedScans.map((scan) => (
          <JobScanView 
            key={scan.id} 
            scan={scan} 
            defaultExpanded={autoExpand}
          />
        ))}
      </div>
    </div>
  );
} 