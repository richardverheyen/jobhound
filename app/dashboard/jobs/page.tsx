'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/app/components/Navbar';
import { Job, JobScan } from '@/types';
import CreateJobModal from '@/app/components/CreateJobModal';

export default function JobsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create job modal state
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(user);
      
      // Fetch user profile data
      const { data: profileData } = await supabase
        .from('users')
        .select('job_search_goal')
        .eq('id', user.id)
        .single();
      
      setProfileData(profileData);
      
      // Fetch jobs with their latest scan
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`
          *,
          job_scans(
            id,
            match_score,
            created_at,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // Process the job data similar to the server component
      const processedJobs = jobsData?.map((job: any) => {
        const sortedScans = job.job_scans?.sort((a: JobScan, b: JobScan) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        
        return {
          ...job,
          scans: sortedScans || [],
          latest_scan: sortedScans?.[0] || null
        };
      }) || [];
      
      setJobs(processedJobs);
      setLoading(false);
    };
    
    fetchData();
  }, [router]);
  
  // Create job modal functions
  const openCreateJobModal = () => {
    setCreateJobModalOpen(true);
  };
  
  const closeCreateJobModal = () => {
    setCreateJobModalOpen(false);
  };
  
  const handleJobCreated = async (jobId: string) => {
    // Refresh the jobs list
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Fetch updated jobs
      const { data: updatedJobs } = await supabase
        .from('jobs')
        .select(`
          *,
          job_scans(
            id,
            match_score,
            created_at,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (updatedJobs) {
        const processedJobs = updatedJobs.map((job: any) => {
          const sortedScans = job.job_scans?.sort((a: JobScan, b: JobScan) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          
          return {
            ...job,
            scans: sortedScans || [],
            latest_scan: sortedScans?.[0] || null
          };
        });
        
        setJobs(processedJobs);
      }
    }
  };
  
  const jobGoal = profileData?.job_search_goal || 10;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-grow px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Applications</h1>
            <button
              onClick={openCreateJobModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Job
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <select
                  defaultValue="all"
                  className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Jobs</option>
                  <option value="recent">Recently Added</option>
                  <option value="matched">High Match Score</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Added Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Match Score</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{job.company}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{job.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{job.location || 'Not specified'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center">
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No job listings yet</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding your first job listing.</p>
                          <div className="mt-6">
                            <button
                              onClick={openCreateJobModal}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              Add New Job
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      
      {/* Create Job Modal */}
      <CreateJobModal 
        isOpen={createJobModalOpen} 
        onClose={closeCreateJobModal} 
        onSuccess={handleJobCreated} 
        navigateToJobOnSuccess={false} 
      />
    </div>
  );
} 