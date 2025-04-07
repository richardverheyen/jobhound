'use client';

import { useState, useEffect } from 'react';
import { supabase, supabaseJs, getCurrentSession } from '@/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/app/components/Navbar'
import { Job, Resume, CreditUsage, User, JobScan } from '@/types'
import ResumeModal from '@/app/components/ResumeModal';
import CreateJobModal from '@/app/components/CreateJobModal';
import JobsList from '@/app/components/JobsList';
import DefaultResumeWidget from '@/app/components/DefaultResumeWidget';
import BuyCreditsButton from '@/app/components/BuyCreditsButton';

export default function DashboardPage() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [creditSummary, setCreditSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [resumeModalOpen, setResumeModalOpen] = useState<boolean>(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  const jobGoal = profileData?.job_search_goal || 5;
  const jobsFound = jobs.length;
  
  const printSession = async () => {
    let session = await getCurrentSession();
    console.log(session);
  }
  
  useEffect(() => {
    printSession();

    // Define fetchData function
    async function fetchData() {
      setLoading(true);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      // Get complete user profile to ensure we have default_resume_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user profile:', userError);
      } else {
        // Merge user auth data with profile data for complete user object
        const completeUser = {
          ...user,
          ...userData
        };
        setUser(completeUser);
        setProfileData(completeUser);
      }
      
      setDisplayName(user.user_metadata?.full_name || user.email);
      
      console.log("querying jobs, user id: ", user.id);

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
    
      // Calculate total credits
      const { data: creditData } = await supabase
        .rpc('get_user_credit_summary', {
          p_user_id: user.id
        });
      
      setCreditSummary(creditData);
      setLoading(false);
    }

    fetchData();
  }, [router]);

  // Make fetchData available outside useEffect
  const refreshData = async () => {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Get complete user profile to ensure we have default_resume_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('Error fetching user profile:', userError);
    } else {
      // Merge user auth data with profile data for complete user object
      const completeUser = {
        ...user,
        ...userData
      };
      setUser(completeUser);
      setProfileData(completeUser);
    }
    
    // Get job listings with their latest scan results
    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`
        *,
        job_scans(
          id, 
          match_score, 
          created_at,
          resume_id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // Process and sort job scans by date
    const processedJobs = jobsData?.map((job: any) => {
      const sortedScans = job.job_scans.sort((a: JobScan, b: JobScan) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      
      return {
        ...job,
        job_scans: sortedScans,
        latest_scan: sortedScans[0] || null
      };
    }) || [];
    
    setJobs(processedJobs);
    
    // Calculate total credits
    const { data: creditData } = await supabase
      .rpc('get_user_credit_summary', {
        p_user_id: user.id
      });
    
    setCreditSummary(creditData);
  };

  // Resume view modal functions
  const openResumeModal = (resume: Resume) => {
    setSelectedResume(resume);
    setResumeModalOpen(true);
  };
  
  const closeResumeModal = () => {
    setResumeModalOpen(false);
    setSelectedResume(null);
  };
  
  // Create job modal functions
  const openCreateJobModal = () => {
    setCreateJobModalOpen(true);
  };
  
  const closeCreateJobModal = () => {
    setCreateJobModalOpen(false);
  };
  
  const handleJobCreated = async (jobId: string) => {
    // Refresh data after a job is created
    await refreshData();
  };

  const handleResumeCreated = async (resumeId: string) => {
    await refreshData();
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
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Navbar user={user} />
      
      <main className="flex-grow px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {displayName}
            </h1>
            <Link
              href="/dashboard/scans/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Generate a Scan
            </Link>
          </div>

          {/* Browser Extension Notification */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Add job listings directly from job boards with our browser extension.
                </p>
                <p className="mt-3 text-sm md:mt-0 md:ml-6">
                  <a href="#" className="whitespace-nowrap font-medium text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200">
                    Coming Soon <span aria-hidden="true">&rarr;</span>
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Jobs List */}
            <div className="lg:col-span-2">
              <JobsList 
                jobs={jobs}
                emptyStateAction={openCreateJobModal}
                title="My Job Listings"
                viewAllLink="/dashboard/jobs"
              />
            </div>

            {/* Right Column: Resume and Job Goal */}
            <div className="space-y-6">

              {/* Job Search Goal */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Job Search Goal</h2>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Progress: {jobsFound} of {jobGoal} jobs</span>
                    <span>{Math.round((jobsFound / jobGoal) * 100)}%</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, Math.round((jobsFound / jobGoal) * 100))}%` }}
                    ></div>
                  </div>
                </div>
                
                <form action="/api/user/update-goal" method="POST" className="flex items-center space-x-2 mb-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Adjust goal:</span>
                  <input 
                    type="number" 
                    name="jobGoal" 
                    min="1" 
                    defaultValue={jobGoal}
                    className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button 
                    type="submit"
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </form>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Setting daily job search goals helps you stay organized and motivated. We recommend applying to 5-10 quality jobs per day.
                </p>
              </div>

              {/* Default Resume */}
              <DefaultResumeWidget
                user={user}
                onViewResume={openResumeModal}
                onCreateResume={(resumeId) => resumeId && handleResumeCreated(resumeId)}
              />

              {/* Credit Usage */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6" data-testid="credit-section">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Credit Usage</h2>
                
                <div className="space-y-3">
                  {creditSummary && creditSummary.recent_usage && creditSummary.recent_usage.length > 0 ? (
                    creditSummary.recent_usage.map((usage: any) => (
                      <div key={usage.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {usage.job_title ? `Scan for ${usage.job_title}` : 'Scan'} on {usage.created_at ? new Date(usage.created_at).toLocaleDateString() : 'Unknown date'}
                          {usage.match_score ? <span className="ml-2 text-blue-600">({usage.match_score}%)</span> : ''}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">-1 credit</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2" data-testid="no-credit-usage">
                      No credit usage yet. Credits are used when scanning your resume against job listings.
                    </p>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Credits</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="available-credits">{creditSummary?.available_credits || 0}</span>
                  </div>
                  
                  <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span data-testid="total-purchased">Total purchased: {creditSummary?.total_purchased || 0}</span>
                    <span data-testid="total-used">Total used: {creditSummary?.total_used || 0}</span>
                  </div>
                  
                  <div className="mt-3">
                    <BuyCreditsButton
                      userId={user?.id}
                      variant="default"
                      className="w-full"
                      returnUrl="/dashboard"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <ResumeModal 
        resume={selectedResume}
        isOpen={resumeModalOpen}
        onClose={closeResumeModal}
      />
      
      <CreateJobModal 
        isOpen={createJobModalOpen} 
        onClose={closeCreateJobModal} 
        onSuccess={handleJobCreated} 
        navigateToJobOnSuccess={false} 
      />
    </div>
  );
}