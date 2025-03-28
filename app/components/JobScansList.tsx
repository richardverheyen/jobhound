'use client';

import { useState } from 'react';
import { JobScan, Resume } from '@/types';
import ProgressRing from './ProgressRing';

interface JobScansListProps {
  scans: JobScan[];
  resumes: Resume[];
}

export default function JobScansList({ scans, resumes }: JobScansListProps) {
  // State to track which scans are expanded (full view)
  const [expandedScans, setExpandedScans] = useState<Record<string, boolean>>({});
  
  const toggleExpandScan = (scanId: string) => {
    setExpandedScans(prev => ({
      ...prev,
      [scanId]: !prev[scanId]
    }));
  };
  
  // Helper function to safely render content
  const safeRender = (content: any): string => {
    if (content === null || content === undefined) return '—';
    if (typeof content === 'string') return content;
    if (typeof content === 'number') return content.toString();
    if (typeof content === 'boolean') return content ? 'Yes' : 'No';
    if (Array.isArray(content)) return content.join(', ');
    if (typeof content === 'object') return JSON.stringify(content);
    return '—';
  };
  
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
      
      <div className="space-y-4">
        {scans.map((scan) => {
          const resumeName = resumes.find(r => r.id === scan.resume_id)?.filename || scan.resume_filename || 'Unknown Resume';
          const isExpanded = expandedScans[scan.id] || false;
          
          return (
            <div key={scan.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Summary Header - Always Visible */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {scan.status === 'completed' && scan.match_score !== null && scan.match_score !== undefined ? (
                      <ProgressRing
                        progress={Math.round(scan.match_score)}
                        size={40}
                        color="#3b82f6"
                      />
                    ) : (
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
                    )}
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
                
                <div className="flex items-center space-x-2">
                  {scan.status === 'completed' && scan.match_score !== null && scan.match_score !== undefined && (
                    <div className="text-right">
                      <span className="block text-xl font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(scan.match_score)}%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Match Score
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => toggleExpandScan(scan.id)}
                    className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">
                      {isExpanded ? 'Collapse details' : 'Show details'}
                    </span>
                    <svg 
                      className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Expanded Details */}
              {isExpanded && scan.status === 'completed' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  {/* Category Scores */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {scan.category_scores ? (
                      <>
                        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Hard Skills</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {Math.round(scan.category_scores.hardSkills * 100)}%
                          </p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Soft Skills</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {Math.round(scan.category_scores.softSkills * 100)}%
                          </p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Searchability</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {Math.round(scan.category_scores.searchability * 100)}%
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Skills</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {scan.results?.skills_match ? `${scan.results.skills_match}%` : (scan.results?.hardSkills ? `${Math.round(scan.results.hardSkills * 100)}%` : '—')}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Experience</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {scan.results?.experience_match ? `${scan.results.experience_match}%` : (scan.results?.experienceMatch ? `${Math.round(scan.results.experienceMatch * 100)}%` : '—')}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Education</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {scan.results?.education_match ? `${scan.results.education_match}%` : (scan.results?.qualifications ? `${Math.round(scan.results.qualifications * 100)}%` : '—')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Recommendation */}
                  <div className="mt-3 text-sm">
                    <p className="font-medium text-gray-700 dark:text-gray-300">Recommendation:</p>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      {safeRender(
                        scan.results?.overall_recommendation || 
                        scan.results?.overallMatch || 
                        scan.overall_match || 
                        'Analysis completed successfully. Check the match scores above.'
                      )}
                    </p>
                  </div>
                  
                  {/* Additional Feedback */}
                  {scan.category_feedback && Object.keys(scan.category_feedback).length > 0 && (
                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Detailed Feedback:</p>
                      <div className="space-y-3">
                        {Object.entries(scan.category_feedback).map(([category, feedback]) => {
                          if (!Array.isArray(feedback)) {
                            return null;
                          }
                          
                          return feedback.length > 0 && (
                            <div key={category} className="text-sm">
                              <p className="text-gray-600 dark:text-gray-400 font-medium">
                                {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                              </p>
                              <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-600 dark:text-gray-400">
                                {feedback.map((item, idx) => (
                                  <li key={idx}>{safeRender(item)}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Error State */}
              {isExpanded && scan.status === 'error' && (
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