'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Job } from '@/types';

interface JobsListProps {
  jobs: Job[];
  emptyStateAction?: () => void;
  showFullDetails?: boolean;
  title?: string;
  viewAllLink?: string;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export default function JobsList({ 
  jobs, 
  emptyStateAction, 
  showFullDetails = false,
  title = 'Job Listings',
  viewAllLink
}: JobsListProps) {
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setColumnsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Column configuration
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'position', label: 'Position', visible: true },
    { id: 'company', label: 'Company', visible: true },
    { id: 'location', label: 'Location', visible: true },
    { id: 'jobType', label: 'Job Type', visible: false },
    { id: 'salary', label: 'Salary', visible: true },
    { id: 'added', label: 'Added', visible: false },
    { id: 'matchScores', label: 'Match Scores', visible: true },
  ]);

  // Handle column visibility toggle
  const toggleColumnVisibility = (columnId: string) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  // Handle sort change when clicking column headers
  const handleSortChange = (columnId: string) => {
    if (sortBy === columnId) {
      // Toggle sort direction if already sorting by this column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with default desc direction
      setSortBy(columnId);
      setSortDirection('desc');
    }
  };
  
  // Sort jobs based on selected criteria
  const sortedJobs = [...jobs].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'date' || sortBy === 'added') {
      comparison = new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    } else if (sortBy === 'matchScores') {
      const scoreA = a.latest_scan?.match_score || 0;
      const scoreB = b.latest_scan?.match_score || 0;
      comparison = scoreB - scoreA;
    } else if (sortBy === 'company') {
      comparison = (a.company || '').localeCompare(b.company || '');
    } else if (sortBy === 'position') {
      comparison = (a.title || '').localeCompare(b.title || '');
    } else if (sortBy === 'location') {
      comparison = (a.location || '').localeCompare(b.location || '');
    } else if (sortBy === 'jobType') {
      comparison = (a.job_type || '').localeCompare(b.job_type || '');
    } else if (sortBy === 'salary') {
      const salaryA = a.salary_range_min || a.salary_range_max || 0;
      const salaryB = b.salary_range_min || b.salary_range_max || 0;
      comparison = salaryB - salaryA;
    }
    
    // Apply sort direction
    return sortDirection === 'asc' ? -comparison : comparison;
  });

  // Add a helper function for properly formatting salary
  const formatSalary = (job: Job) => {
    try {
      // Skip if no salary info
      if (!job.salary_range_min && !job.salary_range_max) {
        return null;
      }
      
      // Use a standard 3-letter currency code for formatting
      let currencyCode = job.salary_currency || '';
      
      // Convert common symbols to ISO currency codes
      if (currencyCode === '$') currencyCode = 'USD';
      if (currencyCode === '£') currencyCode = 'GBP';
      if (currencyCode === '€') currencyCode = 'EUR';
      
      // If still not a valid currency code, just display without currency formatting
      const options: Intl.NumberFormatOptions = {};
      if (currencyCode && currencyCode.length === 3) {
        options.style = 'currency';
        options.currency = currencyCode;
      }
      
      // Format the salary range
      if (job.salary_range_min && job.salary_range_max) {
        const minSalary = options.style === 'currency' 
          ? new Intl.NumberFormat('en-US', options).format(job.salary_range_min)
          : `${currencyCode}${job.salary_range_min.toLocaleString()}`;
        
        const maxSalary = options.style === 'currency'
          ? new Intl.NumberFormat('en-US', options).format(job.salary_range_max)
          : `${currencyCode}${job.salary_range_max.toLocaleString()}`;
        
        return `${minSalary} - ${maxSalary} ${job.salary_period ? `(${job.salary_period})` : ''}`;
      } else if (job.salary_range_min) {
        const salary = options.style === 'currency'
          ? new Intl.NumberFormat('en-US', options).format(job.salary_range_min)
          : `${currencyCode}${job.salary_range_min.toLocaleString()}`;
        
        return `${salary} ${job.salary_period ? `(${job.salary_period})` : ''} minimum`;
      } else if (job.salary_range_max) {
        const salary = options.style === 'currency'
          ? new Intl.NumberFormat('en-US', options).format(job.salary_range_max)
          : `${currencyCode}${job.salary_range_max.toLocaleString()}`;
        
        return `${salary} ${job.salary_period ? `(${job.salary_period})` : ''} maximum`;
      }
      
      return null;
    } catch (error) {
      console.error('Error formatting salary:', error);
      
      // Fallback to simple display without formatting
      if (job.salary_range_min && job.salary_range_max) {
        return `${job.salary_range_min.toLocaleString()} - ${job.salary_range_max.toLocaleString()} ${job.salary_period || ''}`;
      } else if (job.salary_range_min) {
        return `${job.salary_range_min.toLocaleString()} ${job.salary_period || ''}`;
      } else if (job.salary_range_max) {
        return `${job.salary_range_max.toLocaleString()} ${job.salary_period || ''}`;
      }
      
      return null;
    }
  };

  // Progress ring component for match scores
  const MatchScoreRing = ({ score }: { score: number }) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference * (1 - score / 100);
    
    // Determine color based on score
    const getColor = (score: number) => {
      if (score >= 80) return 'stroke-green-500';
      if (score >= 60) return 'stroke-blue-500';
      return 'stroke-yellow-500';
    };
    
    return (
      <div className="inline-flex items-center justify-center h-12 w-12 relative mr-1 last:mr-0">
        <svg className="absolute" width="40" height="40">
          <circle
            className="text-gray-200 dark:text-gray-700"
            stroke="currentColor"
            fill="transparent"
            strokeWidth="3"
            r={radius}
            cx="20"
            cy="20"
          />
          <circle
            className={getColor(score)}
            fill="transparent"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            r={radius}
            cx="20"
            cy="20"
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span className="text-xs font-medium">{score}%</span>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h2>
        
        <div className="flex items-center space-x-4">
          {viewAllLink && (
            <Link href={viewAllLink} className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
              View All
            </Link>
          )}
          
          {/* Column visibility dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setColumnsDropdownOpen(!columnsDropdownOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Columns
            </button>
            <div className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-10 ${columnsDropdownOpen ? 'block' : 'hidden'}`}>
              <div className="py-1" role="menu" aria-orientation="vertical">
                {columns.map(col => (
                  <div key={col.id} className="px-4 py-2 text-sm flex items-center">
                    <input
                      type="checkbox"
                      id={`col-${col.id}`}
                      checked={col.visible}
                      onChange={() => toggleColumnVisibility(col.id)}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor={`col-${col.id}`} className="text-gray-700 dark:text-gray-200">
                      {col.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map(column => column.visible && (
                  <th 
                    key={column.id} 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSortChange(column.id)}
                  >
                    <div className="flex items-center">
                      {column.label}
                      {sortBy === column.id && (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedJobs.map((job) => (
                <tr 
                  key={job.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => window.location.href = `/dashboard/jobs/${job.id}`}
                >
                  {columns.find(col => col.id === 'position')?.visible && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{job.title}</div>
                    </td>
                  )}
                  
                  {columns.find(col => col.id === 'company')?.visible && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{job.company}</div>
                    </td>
                  )}
                  
                  {columns.find(col => col.id === 'location')?.visible && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{job.location || 'Not specified'}</div>
                    </td>
                  )}
                  
                  {columns.find(col => col.id === 'jobType')?.visible && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{job.job_type || 'Not specified'}</div>
                    </td>
                  )}
                  
                  {columns.find(col => col.id === 'salary')?.visible && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{formatSalary(job) || 'Not specified'}</div>
                    </td>
                  )}
                  
                  {columns.find(col => col.id === 'added')?.visible && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Unknown'}
                    </td>
                  )}
                  
                  {columns.find(col => col.id === 'matchScores')?.visible && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {job.latest_scan?.match_score ? (
                          <>
                            {/* For simplicity, let's show the latest score 3 times (you'd need to modify Job type to include history) */}
                            <MatchScoreRing score={job.latest_scan.match_score} />
                            {job.latest_scan.match_score > 10 && <MatchScoreRing score={Math.max(0, job.latest_scan.match_score - 10)} />}
                            {job.latest_scan.match_score > 20 && <MatchScoreRing score={Math.max(0, job.latest_scan.match_score - 20)} />}
                          </>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Not scanned</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No job listings yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding your first job listing.</p>
          {emptyStateAction && (
            <div className="mt-6">
              <button
                onClick={emptyStateAction}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add New Job
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 