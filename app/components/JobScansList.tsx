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
      <div className="bg-[#1e2837] text-white shadow rounded-lg p-6">
        <h3 className="text-base font-medium mb-4">Previous Scans</h3>
        <div className="py-4 text-center text-sm text-gray-300">
          No scans yet. Select a resume and click "Scan Resume" to analyze your resume against this job.
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-[#1e2837] text-white shadow rounded-lg">
      <h3 className="text-base font-medium p-6 pb-4">Previous Scans</h3>
      
      <div className="space-y-6">
        {scans.map((scan) => {
          const resumeName = resumes.find(r => r.id === scan.resume_id)?.filename || scan.resume_filename || 'Unknown Resume';
          
          return (
            <div key={scan.id} className="rounded-lg overflow-hidden">
              <div className="p-4 bg-[#1e2837] border-b border-[#3a4658] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">
                    {resumeName}
                  </h4>
                  <p className="mt-1 text-xs text-gray-400">
                    {scan.created_at && new Date(scan.created_at).toLocaleString()}
                  </p>
                  {scan.status !== 'completed' && (
                    <p className="text-xs text-gray-400">
                      Status: <span className={
                        scan.status === 'completed' ? 'text-green-400' : 
                        scan.status === 'error' ? 'text-red-400' : 
                        'text-yellow-400'
                      }>
                        {scan.status}
                      </span>
                    </p>
                  )}
                </div>
                
                {scan.status === 'completed' && scan.match_score !== null && scan.match_score !== undefined && (
                  <div className="text-right">
                    <span className="block text-xl font-bold text-blue-400">
                      {Math.round(scan.match_score)}%
                    </span>
                    <span className="text-xs text-gray-400">
                      Match Score
                    </span>
                  </div>
                )}
              </div>
              
              <JobScanView scan={scan} />
            </div>
          );
        })}
      </div>
    </div>
  );
} 