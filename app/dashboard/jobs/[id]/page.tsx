'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase/client';
import { Navbar } from '@/app/components/Navbar';
import { Job, JobScan, Resume } from '@/types';
import { useRouter } from 'next/navigation';
import CreateResumeModal from '@/app/components/CreateResumeModal';
import CompareResumeToJob from '@/app/components/CompareResumeToJob';
import JobScansList from '@/app/components/JobScansList';

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
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    }
  };

  // Create resume modal functions
  const closeCreateResumeModal = () => {
    setCreateResumeModalOpen(false);
  };
  
  const handleResumeCreated = async (resumeId: string) => {
    // Refresh data
    fetchData();
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

            {/* Right column: Resume Analysis */}
            <div className="md:col-span-2 space-y-6">
              {/* Resume Analysis Component */}
              <CompareResumeToJob 
                job={job}
                resumes={resumes}
                onScanComplete={fetchData}
                user={user}
              />
              
              {/* Previous Scans List */}
              <JobScansList 
                scans={scans}
                resumes={resumes}
              />
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