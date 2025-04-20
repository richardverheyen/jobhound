'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase/client';
import { Navbar } from '@/app/components/Navbar';
import { Job, JobScan, Resume } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import JobScanForm from '@/app/components/JobScanForm';
import JobScansList from '@/app/components/JobScansList';
import { createScan } from '@/app/lib/scanService';
import { JobSummary } from '@/app/components/JobSummary';

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
      
      // Use the createScan function from scanService to create the scan
      const result = await createScan({
        jobId: jobId,
        resumeId: resumeId
      });
      
      if (result.success) {
        console.log("Successfully created scan with ID:", result.scanId);
        // Refresh the data to show the new scan
        fetchData();
        // Remove the pendingScan parameter from URL to prevent repeated scans on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        console.error("Error creating scan:", result.error);
      }
    } catch (error) {
      console.error("Error processing pending scan:", error);
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
      
      // Fetch available resumes only if they haven't been loaded yet
      if (resumes.length === 0) {
        const { data: resumesData, error: resumesError } = await supabase
          .from('resumes')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (resumesError) {
          console.error('Error fetching resumes:', resumesError);
        } else {
          setResumes(resumesData || []);
        }
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
      
      <main className="flex-grow flex flex-col px-4 py-8">
        <div className="flex justify-between items-center mb-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
          {/* Left column: Job details */}
          <div className="md:overflow-y-auto md:pr-2 h-full">
            <JobSummary job={job} />
          </div>

          {/* Right column: Resume Analysis */}
          <div className="space-y-6 md:overflow-y-auto md:pl-2 h-full">
            {/* Resume Analysis Component */}
            <JobScanForm 
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
      </main>
    </div>
  );
} 
