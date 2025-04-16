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
  
  // Auto-expand the scan if there's only one
  const autoExpand = scans.length === 1;
  
  return (
    <div className="bg-[#1e2837] text-white shadow rounded-lg">
      <h3 className="text-base font-medium p-6 pb-4">Previous Scans</h3>
      
      <div className="space-y-6">
        {scans.map((scan) => (
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