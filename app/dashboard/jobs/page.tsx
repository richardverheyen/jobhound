'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/app/components/Navbar';
import { Job, JobScan } from '@/types';
import CreateJobModal from '@/app/components/CreateJobModal';
import JobsList from '@/app/components/JobsList';

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

          <JobsList 
            jobs={jobs}
            emptyStateAction={openCreateJobModal}
            showFullDetails={true}
            title="All Job Applications"
          />
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