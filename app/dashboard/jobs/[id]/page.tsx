'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase/client';
import { Navbar } from '@/app/components/Navbar';
import { Job, JobScan, Resume } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import CompareResumeToJob from '@/app/components/CompareResumeToJob';
import JobScansList from '@/app/components/JobScansList';
import { createScan } from '@/app/lib/scanService';

interface JobDetailPageProps {
  params: {
    id: string;
  };
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params.id;
  const [job, setJob] = useState<Job | null>(null);
  const [scans, setScans] = useState<JobScan[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isProcessingPendingScan, setIsProcessingPendingScan] = useState(false);

  // Fetch user data
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    getUser();
  }, []);

  // Check for pending scan from URL parameters
  useEffect(() => {
    const pendingScanResumeId = searchParams.get('pendingScan');
    
    if (pendingScanResumeId && job && !isProcessingPendingScan) {
      handlePendingScan(pendingScanResumeId);
    }
  }, [searchParams, job, isProcessingPendingScan]);

  // Function to handle pending scan from URL parameter
  const handlePendingScan = async (resumeId: string) => {
    setIsProcessingPendingScan(true);
    
    try {
      console.log("Processing pending scan for resume:", resumeId);
      
      // Find the resume details
      const selectedResume = resumes.find(resume => resume.id === resumeId);
      if (!selectedResume) {
        console.error("Resume not found:", resumeId);
        return;
      }
      
      // Create a pending scan object and add it to the list immediately
      // so the user sees the loading state right away
      const pendingScan: JobScan = {
        id: `pending-${Date.now()}`, // Temporary ID
        job_id: jobId,
        resume_id: resumeId,
        user_id: user?.id || '',
        resume_filename: selectedResume.filename,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      // Add the pending scan to the local state
      setScans(prevScans => [pendingScan, ...prevScans]);
      
      // Use the createScan function from scanService to create the scan
      const result = await createScan({
        jobId: jobId,
        resumeId: resumeId
      });
      
      if (result.success) {
        console.log("Successfully created scan with ID:", result.scanId);
        // Refresh the data to show the updated scan status
        fetchData();
        // Remove the pendingScan parameter from URL to prevent repeated scans on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        console.error("Error creating scan:", result.error);
        // Remove the pending scan if there was an error
        setScans(prevScans => prevScans.filter(scan => scan.id !== pendingScan.id));
      }
    } catch (error) {
      console.error("Error processing pending scan:", error);
      // Remove any temporary pending scans on error
      setScans(prevScans => prevScans.filter(scan => !scan.id.toString().startsWith('pending-')));
    } finally {
      setIsProcessingPendingScan(false);
    }
  };

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
        
        // Parse hard skills
        let hardSkills = [];
        if (jobData.hard_skills) {
          try {
            // Handle if the data is a JSON string
            if (typeof jobData.hard_skills === 'string') {
              hardSkills = JSON.parse(jobData.hard_skills);
            } 
            // Handle if the data is already an array
            else if (Array.isArray(jobData.hard_skills)) {
              hardSkills = jobData.hard_skills;
            } 
            // Handle if the data is a JSONB object already parsed
            else if (typeof jobData.hard_skills === 'object') {
              hardSkills = Object.values(jobData.hard_skills);
            }
          } catch (e) {
            console.error('Error parsing hard skills:', e);
          }
        }
        
        // Parse soft skills
        let softSkills = [];
        if (jobData.soft_skills) {
          try {
            // Handle if the data is a JSON string
            if (typeof jobData.soft_skills === 'string') {
              softSkills = JSON.parse(jobData.soft_skills);
            } 
            // Handle if the data is already an array
            else if (Array.isArray(jobData.soft_skills)) {
              softSkills = jobData.soft_skills;
            } 
            // Handle if the data is a JSONB object already parsed
            else if (typeof jobData.soft_skills === 'object') {
              softSkills = Object.values(jobData.soft_skills);
            }
          } catch (e) {
            console.error('Error parsing soft skills:', e);
          }
        }
        
        setJob({
          ...jobData,
          requirements,
          benefits,
          hard_skills: hardSkills,
          soft_skills: softSkills
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {job.hard_skills && job.hard_skills.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Hard Skills</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.isArray(job.hard_skills) ? 
                        job.hard_skills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                            {skill}
                          </span>
                        ))
                        : null
                      }
                    </div>
                  </div>
                )}

                {job.soft_skills && job.soft_skills.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Soft Skills</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.isArray(job.soft_skills) ? 
                        job.soft_skills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                            {skill}
                          </span>
                        ))
                        : null
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Resume Analysis */}
            <div className="md:col-span-1 space-y-6">
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
    </div>
  );
} 