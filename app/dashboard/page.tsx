import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/app/components/Navbar'
import { Job, Resume, CreditUsage, User, JobScan } from '@/app/types'

export default async function Dashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user profile data to get default_resume_id
  const { data: profileData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as User

  // Fetch jobs with their latest scan
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      scans:job_scans(
        id,
        match_score,
        created_at,
        status
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get default resume
  const { data: defaultResume } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', profile?.default_resume_id || '')
    .single()

  // Get credit usage history
  const { data: creditUsage } = await supabase
    .from('credit_usage')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get remaining credits
  const { data: creditPurchases } = await supabase
    .from('credit_purchases')
    .select('remaining_credits')
    .eq('user_id', user.id)
    .gt('remaining_credits', 0)
    .order('expires_at', { ascending: true })

  const totalCredits = creditPurchases?.reduce((sum, purchase) => sum + (purchase.remaining_credits || 0), 0) || 0

  // Get job goal setting from user profile
  const jobGoal = profile?.job_search_goal || 10
  const jobsFound = jobs?.length || 0

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-grow px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.email?.split('@')[0] || 'User'}
            </h1>
            <Link
              href="/dashboard/jobs/new"
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
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Job Listings</h2>
                  <Link href="/dashboard/jobs" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    View All
                  </Link>
                </div>

                {jobs && jobs.length > 0 ? (
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
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Location
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Match
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {jobs.map((job: any) => {
                          // Find most recent scan with a match score
                          const latestScan = job.scans?.sort((a: any, b: any) => 
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                          )[0];
                          
                          return (
                            <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">{job.location || 'Not specified'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {latestScan?.match_score ? (
                                  <span className={`font-medium ${
                                    latestScan.match_score >= 80 ? 'text-green-600 dark:text-green-400' :
                                    latestScan.match_score >= 60 ? 'text-blue-600 dark:text-blue-400' :
                                    'text-yellow-600 dark:text-yellow-400'
                                  }`}>
                                    {latestScan.match_score}%
                                  </span>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">Not scanned</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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
                    <div className="mt-6">
                      <Link
                        href="/dashboard/jobs/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add New Job
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Resume and Job Goal */}
            <div className="space-y-6">
              {/* Default Resume */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Default Resume</h2>
                  <Link href="/dashboard/resumes" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Manage Resumes
                  </Link>
                </div>

                {defaultResume ? (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <svg className="h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {defaultResume.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Uploaded {defaultResume.created_at ? new Date(defaultResume.created_at).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/resumes/${defaultResume.id}`}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg className="mx-auto h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No default resume</h3>
                    <div className="mt-3">
                      <Link
                        href="/dashboard/resumes/new"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Upload Resume
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={defaultResume ? `/dashboard/jobs/new?resumeId=${defaultResume.id}` : '/dashboard/jobs/new'}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
                    </svg>
                    Generate New Scan
                  </Link>
                </div>
              </div>

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

              {/* Credit Usage */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Credit Usage</h2>
                
                <div className="space-y-3">
                  {creditUsage && creditUsage.length > 0 ? (
                    creditUsage.map((usage: CreditUsage) => (
                      <div key={usage.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Scan on {usage.created_at ? new Date(usage.created_at).toLocaleDateString() : 'Unknown date'}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">-1 credit</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      No credit usage yet. Credits are used when scanning your resume against job listings.
                    </p>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Credits</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalCredits}</span>
                  </div>
                  {totalCredits === 0 && (
                    <div className="mt-3">
                      <Link 
                        href="/dashboard/credits/buy"
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Buy Credits
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}