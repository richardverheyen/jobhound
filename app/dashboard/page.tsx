import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/app/components/Navbar';
import JobsList from '@/app/components/JobsList';
import DashboardClient from '@/app/dashboard/DashboardClient';
import { Job, JobScan } from '@/types';

export default async function DashboardPage() {
  // Server-side authentication check
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const user = session.user;
  const displayName = user.user_metadata?.full_name || user.email;

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

  // Get user profile data for job goal
  const { data: userData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get default resume if set
  let defaultResume = null;
  if (user.default_resume_id) {
    const { data: resumeData } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', user.default_resume_id)
      .single();
    
    defaultResume = resumeData;
  }

  // Get credit summary
  const { data: creditData } = await supabase
    .rpc('get_user_credit_summary', {
      p_user_id: user.id
    });

  const jobGoal = userData?.job_search_goal || 5;
  const jobsFound = processedJobs.length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Navbar is a client component */}
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
            {/* Jobs List - This is a client component */}
            <div className="lg:col-span-2">
              <JobsList 
                jobs={processedJobs}
                title="My Job Listings"
                viewAllLink="/dashboard/jobs"
                emptyStateAction="openJobModal"
              />
            </div>

            {/* Right Column: Resume, Job Goal, and Credit Usage - These need client interactions */}
            <DashboardClient 
              user={user}
              defaultResume={defaultResume}
              jobGoal={jobGoal}
              jobsFound={jobsFound}
              creditData={creditData}
            />
          </div>
        </div>
      </main>
    </div>
  );
}