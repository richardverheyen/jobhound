'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/app/components/Navbar';
import { Job, JobScan } from '@/types';
import JobsList from '@/app/components/JobsList';

export default function JobsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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
        
        // Clean up currency data if it contains '$' or other invalid currency codes
        let cleanedJob = { ...job };
        if (cleanedJob.salary_currency === '$') {
          cleanedJob.salary_currency = 'USD';
        } else if (cleanedJob.salary_currency === '£') {
          cleanedJob.salary_currency = 'GBP';
        } else if (cleanedJob.salary_currency === '€') {
          cleanedJob.salary_currency = 'EUR';
        }
        
        return {
          ...cleanedJob,
          scans: sortedScans || [],
          latest_scan: sortedScans?.[0] || null
        };
      }) || [];
      
      setJobs(processedJobs);
      setLoading(false);
    };
    
    fetchData();
  }, [router]);
  
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
          
          // Clean up currency data if it contains '$' or other invalid currency codes
          let cleanedJob = { ...job };
          if (cleanedJob.salary_currency === '$') {
            cleanedJob.salary_currency = 'USD';
          } else if (cleanedJob.salary_currency === '£') {
            cleanedJob.salary_currency = 'GBP';
          } else if (cleanedJob.salary_currency === '€') {
            cleanedJob.salary_currency = 'EUR';
          }
          
          return {
            ...cleanedJob,
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
          </div>

          <JobsList 
            jobs={jobs}
            showFullDetails={true}
            title="My Job Listings"
            onJobCreated={handleJobCreated}
          />
        </div>
      </main>
    </div>
  );
} 