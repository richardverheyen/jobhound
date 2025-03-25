'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Job } from '@/types';

interface JobsListProps {
  jobs: Job[];
  emptyStateAction?: () => void;
  showFullDetails?: boolean;
  title?: string;
  viewAllLink?: string;
}

export default function JobsList({ 
  jobs, 
  emptyStateAction, 
  showFullDetails = false,
  title = 'Job Listings',
  viewAllLink
}: JobsListProps) {
  const [sortBy, setSortBy] = useState<string>('date');
  
  // Sort jobs based on selected criteria
  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    } else if (sortBy === 'match') {
      const scoreA = a.latest_scan?.match_score || 0;
      const scoreB = b.latest_scan?.match_score || 0;
      return scoreB - scoreA;
    } else if (sortBy === 'company') {
      return (a.company || '').localeCompare(b.company || '');
    }
    return 0;
  });

  // Format salary range for display
  const formatSalary = (job: Job) => {
    if (!job.salary_range_min && !job.salary_range_max) return 'Not specified';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: job.salary_currency || 'USD',
      maximumFractionDigits: 0,
    });
    
    let salaryText = '';
    
    if (job.salary_range_min && job.salary_range_max) {
      salaryText = `${formatter.format(job.salary_range_min)} - ${formatter.format(job.salary_range_max)}`;
    } else if (job.salary_range_min) {
      salaryText = `From ${formatter.format(job.salary_range_min)}`;
    } else if (job.salary_range_max) {
      salaryText = `Up to ${formatter.format(job.salary_range_max)}`;
    }
    
    if (job.salary_period) {
      salaryText += ` (${job.salary_period})`;
    }
    
    return salaryText;
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
          <div className="flex items-center space-x-2">
            <label htmlFor="sortBy" className="text-sm text-gray-500 dark:text-gray-400">
              Sort by:
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md shadow-sm"
            >
              <option value="date">Date Added</option>
              <option value="match">Match Score</option>
              <option value="company">Company</option>
            </select>
          </div>
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Company
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Position
                </th>
                {showFullDetails && (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Job Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Salary
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </>
                )}
                {!showFullDetails && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Added
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Match
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/dashboard/jobs/${job.id}`}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {job.company}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{job.title}</div>
                  </td>
                  {showFullDetails ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{job.location || 'Not specified'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{job.job_type || 'Not specified'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatSalary(job)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          {job.status || 'Active'}
                        </span>
                      </td>
                    </>
                  ) : (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{job.location || 'Not specified'}</div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {job.latest_scan?.match_score ? (
                      <span className={`font-medium ${
                        job.latest_scan.match_score >= 80 ? 'text-green-600 dark:text-green-400' :
                        job.latest_scan.match_score >= 60 ? 'text-blue-600 dark:text-blue-400' :
                        'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {job.latest_scan.match_score}%
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Not scanned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/dashboard/jobs/${job.id}`} className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                      View
                    </Link>
                  </td>
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