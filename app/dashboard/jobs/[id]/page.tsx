'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase/client';
import { Navbar } from '@/app/components/Navbar';
import { Job, JobScan, Resume } from '@/types';
import { useRouter } from 'next/navigation';
import CreateResumeModal from '@/app/components/CreateResumeModal';

interface JobDetailPageProps {
  params: {
    id: string;
  };
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const router = useRouter();
  const jobId = params.id;
  const [job, setJob] = useState<Job | null>(null);
  const [scans, setScans] = useState<JobScan[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [createResumeModalOpen, setCreateResumeModalOpen] = useState<boolean>(false);

  // Fetch user data
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    getUser();
  }, []);

  // Fetch job and scans data
  useEffect(() => {
    fetchData();
  }, [params.id]);
  
  // Function to fetch job, scans, and resume data
  const fetchData = async () => {
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', params.id)
        .single();
        
      if (jobError) {
        console.error('Error fetching job:', jobError);
        return;
      }
      
      if (jobData) {
        // Properly parse requirements and benefits which may be JSONB columns
        let requirements = [];
        if (jobData.requirements) {
          try {
            // Handle if the data is a JSON string
            if (typeof jobData.requirements === 'string') {
              requirements = JSON.parse(jobData.requirements);
            } 
            // Handle if the data is already an array
            else if (Array.isArray(jobData.requirements)) {
              requirements = jobData.requirements;
            } 
            // Handle if the data is a JSONB object already parsed
            else if (typeof jobData.requirements === 'object') {
              requirements = Object.values(jobData.requirements);
            }
          } catch (e) {
            console.error('Error parsing requirements:', e);
          }
        }
        
        let benefits = [];
        if (jobData.benefits) {
          try {
            // Handle if the data is a JSON string
            if (typeof jobData.benefits === 'string') {
              benefits = JSON.parse(jobData.benefits);
            } 
            // Handle if the data is already an array
            else if (Array.isArray(jobData.benefits)) {
              benefits = jobData.benefits;
            } 
            // Handle if the data is a JSONB object already parsed
            else if (typeof jobData.benefits === 'object') {
              benefits = Object.values(jobData.benefits);
            }
          } catch (e) {
            console.error('Error parsing benefits:', e);
          }
        }
        
        setJob({
          ...jobData,
          requirements,
          benefits
        });
      }
      
      // Fetch job scans
      const { data: scansData, error: scansError } = await supabase
        .from('job_scans')
        .select('*')
        .eq('job_id', params.id)
        .order('created_at', { ascending: false });
        
      if (scansError) {
        console.error('Error fetching job scans:', scansError);
      } else {
        setScans(scansData || []);
      }
      
      // Fetch available resumes
      const { data: resumesData, error: resumesError } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (resumesError) {
        console.error('Error fetching resumes:', resumesError);
      } else {
        setResumes(resumesData || []);
        
        // Set default selected resume if any exist
        if (resumesData && resumesData.length > 0) {
          // Try to find the default resume from the user record
          const { data: userData } = await supabase.auth.getUser();
          const { data: userProfile } = await supabase
            .from('users')
            .select('default_resume_id')
            .eq('id', userData.user?.id)
            .single();
            
          if (userProfile && userProfile.default_resume_id) {
            setSelectedResumeId(userProfile.default_resume_id);
          } else {
            // Otherwise use the first resume
            setSelectedResumeId(resumesData[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    }
  };

  const handleScan = async () => {
    if (!selectedResumeId) return;
    
    setIsScanning(true);
    
    try {
      // Get the resume filename for display purposes
      const resume = resumes.find(r => r.id === selectedResumeId);
      
      // Create a new scan record
      const { data: scanData, error: scanError } = await supabase.rpc('create_job_scan', {
        p_user_id: user.id,
        p_job_id: job?.id,
        p_resume_id: selectedResumeId,
        p_resume_filename: resume?.filename || 'Unknown',
        p_job_posting: job?.description || ''
      });
      
      if (scanError) {
        console.error('Error creating scan:', scanError);
        alert('Failed to create scan. Please try again.');
      } else {
        // Refresh the data to show the new scan
        fetchData();
      }
    } catch (error) {
      console.error('Error in handleScan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Create resume modal functions
  const openCreateResumeModal = () => {
    setCreateResumeModalOpen(true);
  };
  
  const closeCreateResumeModal = () => {
    setCreateResumeModalOpen(false);
  };
  
  const handleResumeCreated = async (resumeId: string) => {
    // Refresh data
    fetchData();
    // Select the newly created resume
    setSelectedResumeId(resumeId);
  };

  if (!job) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} />
      
      <main className="flex-grow px-4 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{job.title} at {job.company}</h1>
            <div className="flex space-x-2">
              <Link
                href={`/dashboard/jobs/${job.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Edit Job
              </Link>
              <Link
                href="/dashboard/jobs"
                className="text-blue-600 hover:text-blue-500"
              >
                Back to Jobs
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left column: Job details */}
            <div className="md:col-span-1">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Job Details</h2>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{job.company}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Position</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{job.title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{job.location || 'Not specified'}</p>
                    </div>
                    {job.job_type && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Type</p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{job.job_type}</p>
                      </div>
                    )}
                    {(job.salary_range_min || job.salary_range_max) && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Salary Range</p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {job.salary_range_min !== undefined && job.salary_range_max !== undefined
                            ? `${job.salary_currency ? job.salary_currency + ' ' : ''}${job.salary_range_min.toLocaleString()} - ${job.salary_currency ? job.salary_currency + ' ' : ''}${job.salary_range_max.toLocaleString()} ${job.salary_period ? `(${job.salary_period})` : ''}`
                            : job.salary_range_min !== undefined
                              ? `${job.salary_currency ? job.salary_currency + ' ' : ''}${job.salary_range_min.toLocaleString()} ${job.salary_period ? `(${job.salary_period})` : ''} minimum`
                              : job.salary_range_max !== undefined
                                ? `${job.salary_currency ? job.salary_currency + ' ' : ''}${job.salary_range_max.toLocaleString()} ${job.salary_period ? `(${job.salary_period})` : ''} maximum`
                                : 'Salary details not available'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Description</h3>
                  <div className="mt-2 text-sm text-gray-900 dark:text-white whitespace-pre-line">
                    {job.description}
                  </div>
                </div>

                {job.requirements && job.requirements.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Requirements</h3>
                    <ul className="mt-2 text-sm text-gray-900 dark:text-white list-disc pl-5 space-y-1">
                      {Array.isArray(job.requirements) ? 
                        job.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))
                        : null
                      }
                    </ul>
                  </div>
                )}

                {job.benefits && job.benefits.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Benefits</h3>
                    <ul className="mt-2 text-sm text-gray-900 dark:text-white list-disc pl-5 space-y-1">
                      {Array.isArray(job.benefits) ? 
                        job.benefits.map((benefit, index) => (
                          <li key={index}>{benefit}</li>
                        ))
                        : null
                      }
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Scan section */}
            <div className="md:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Resume Analysis</h2>
                
                <div className="mt-4 mb-6">
                  <label htmlFor="resume" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Resume to Scan
                  </label>
                  <div className="mt-1 flex">
                    <select
                      id="resume"
                      name="resume"
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select a resume</option>
                      {resumes.map(resume => (
                        <option key={resume.id} value={resume.id}>
                          {resume.filename} {resume.is_default ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleScan}
                      disabled={!selectedResumeId || isScanning}
                      className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isScanning ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing...
                        </>
                      ) : (
                        'Scan Resume'
                      )}
                    </button>
                  </div>
                  <div className="mt-2">
                    <button 
                      onClick={openCreateResumeModal}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      + Upload a new resume
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Previous Scans</h3>
                  
                  {scans.length === 0 ? (
                    <div className="mt-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No scans yet. Select a resume and click "Scan Resume" to analyze your resume against this job.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {scans.map((scan) => {
                        const resumeName = resumes.find(r => r.id === scan.resume_id)?.filename || 'Unknown Resume';
                        
                        return (
                          <div key={scan.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                  Scan with {scan.resume_filename || resumeName}
                                </h4>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {scan.created_at && new Date(scan.created_at).toLocaleString()}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Status: <span className={scan.status === 'completed' ? 'text-green-500' : scan.status === 'error' ? 'text-red-500' : 'text-yellow-500'}>
                                    {scan.status}
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center">
                                {scan.match_score !== null && scan.match_score !== undefined ? (
                                  <>
                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                      {Math.round(scan.match_score)}%
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Match Score</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {scan.status === 'error' ? 'Failed' : 'Processing...'}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {scan.status === 'completed' && scan.results && (
                              <div className="mt-4">
                                <div className="grid grid-cols-3 gap-2 mb-3">
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
                                          {scan.results.skills_match || (scan.results.hardSkills ? Math.round(scan.results.hardSkills * 100) : '—')}%
                                        </p>
                                      </div>
                                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Experience</p>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                          {scan.results.experience_match || (scan.results.experienceMatch ? Math.round(scan.results.experienceMatch * 100) : '—')}%
                                        </p>
                                      </div>
                                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Education</p>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                          {scan.results.education_match || (scan.results.qualifications ? Math.round(scan.results.qualifications * 100) : '—')}%
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                                  <p className="font-medium">Recommendation:</p>
                                  <p className="mt-1">
                                    {scan.results.overall_recommendation || 
                                     scan.results.overallMatch || 
                                     scan.overall_match || 
                                     'Analysis completed successfully. Check the match scores above.'}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {scan.status === 'error' && (
                              <div className="mt-3 text-sm text-red-500">
                                <p>Error: {scan.error_message || 'An error occurred during scan processing'}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Add CreateResumeModal */}
      <CreateResumeModal
        isOpen={createResumeModalOpen}
        onClose={closeCreateResumeModal}
        onSuccess={handleResumeCreated}
      />
    </div>
  );
} 