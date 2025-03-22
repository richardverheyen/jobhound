'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/utils/supabase';
import { Navbar } from '@/app/components/Navbar';
import { Job, JobScan, Resume } from '@/types';
import { useRouter } from 'next/navigation';

interface JobDetailPageProps {
  params: {
    id: string;
  };
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [scans, setScans] = useState<JobScan[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

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
    // This would be replaced with actual API calls
    const fetchData = async () => {
      // Simulating API calls with timeouts
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock job data
      setJob({
        id: params.id,
        company: 'Tech Solutions Inc.',
        title: 'Frontend Developer',
        status: 'Applied',
        applied_date: '2023-05-15',
        location: 'Remote',
        description: 'We are looking for a Frontend Developer proficient in React, TypeScript, and modern CSS frameworks. The ideal candidate should have 3+ years of experience building responsive web applications with a focus on user experience and performance optimization. Experience with Next.js, GraphQL, and state management libraries is a plus.'
      });

      // Mock scans data
      setScans([
        {
          id: '1',
          job_id: params.id,
          resume_id: 'resume1',
          status: 'Completed',
          match_score: 85,
          created_at: '2023-05-16T12:00:00Z',
          results: {
            skills_match: 90,
            experience_match: 80,
            education_match: 85,
            overall_recommendation: 'Your resume is a strong match for this position. Consider highlighting your experience with React and TypeScript more prominently.'
          }
        },
        {
          id: '2',
          job_id: params.id,
          resume_id: 'resume2',
          status: 'Completed',
          match_score: 72,
          created_at: '2023-05-18T15:30:00Z',
          results: {
            skills_match: 75,
            experience_match: 70,
            education_match: 80,
            overall_recommendation: 'Your resume has several key matches but could be improved. Consider adding more details about your frontend development experience.'
          }
        }
      ]);

      // Mock resumes data
      setResumes([
        {
          id: 'resume1',
          filename: 'resume_frontend_dev.pdf',
          is_default: true,
          created_at: '2023-05-10T10:00:00Z'
        },
        {
          id: 'resume2',
          filename: 'resume_updated.pdf',
          is_default: false,
          created_at: '2023-05-12T14:00:00Z'
        }
      ]);
      
      // Set default selected resume
      setSelectedResumeId('resume1');
    };

    fetchData();
  }, [params.id]);

  const handleScan = async () => {
    if (!selectedResumeId) return;
    
    setIsScanning(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add mock scan result
    const newScan: JobScan = {
      id: `scan-${Date.now()}`,
      job_id: params.id,
      resume_id: selectedResumeId,
      status: 'Completed',
      match_score: Math.floor(Math.random() * 30) + 65, // Random score between 65-95
      created_at: new Date().toISOString(),
      results: {
        skills_match: Math.floor(Math.random() * 30) + 70,
        experience_match: Math.floor(Math.random() * 30) + 70,
        education_match: Math.floor(Math.random() * 30) + 70,
        overall_recommendation: 'This is a new scan result with automated feedback based on your resume and the job description.'
      }
    };
    
    setScans(prev => [newScan, ...prev]);
    setIsScanning(false);
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
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                      <p className="mt-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          job.status === 'Applied' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          job.status === 'Interview' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          job.status === 'Offer' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          job.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {job.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Applied</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {job.applied_date ? new Date(job.applied_date).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Description</h3>
                  <div className="mt-2 text-sm text-gray-900 dark:text-white whitespace-pre-line">
                    {job.description}
                  </div>
                </div>
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
                    <Link href="/dashboard/resumes/new" className="text-sm text-blue-600 hover:text-blue-500">
                      + Upload a new resume
                    </Link>
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
                                  Scan with {resumeName}
                                </h4>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(scan.created_at!).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center">
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {scan.match_score}%
                                </span>
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Match Score</span>
                              </div>
                            </div>
                            
                            {scan.results && (
                              <div className="mt-4">
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Skills</p>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{scan.results.skills_match}%</p>
                                  </div>
                                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Experience</p>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{scan.results.experience_match}%</p>
                                  </div>
                                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Education</p>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{scan.results.education_match}%</p>
                                  </div>
                                </div>
                                
                                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                                  <p className="font-medium">Recommendation:</p>
                                  <p className="mt-1">{scan.results.overall_recommendation}</p>
                                </div>
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
    </div>
  );
} 