'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Navbar } from '@/app/components/Navbar';

export default function NewJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    getUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a job');
      }
      
      // Use the create_job RPC function instead of direct insert
      const { data, error } = await supabase
        .rpc('create_job', {
          p_company: formData.company,
          p_title: formData.position,
          p_location: formData.location,
          p_description: formData.description
        });
      
      if (error) {
        throw error;
      }
      
      // Redirect to job view page if we have the new job data
      if (data?.success) {
        router.push(`/dashboard/jobs/${data.job_id}`);
      } else {
        router.push('/dashboard/jobs');
      }
    } catch (error: any) {
      console.error('Error submitting job data:', error);
      setError(error.message || 'An error occurred while creating the job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} />
      
      <main className="flex-grow px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Job</h1>
            <Link 
              href="/dashboard/jobs"
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Back to Jobs
            </Link>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Dev-only RLS test button */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                  RLS Diagnostic Tools (Development Only)
                </summary>
                <div className="mt-3 space-y-3">
                  <button
                    onClick={async () => {
                      try {
                        const supabase = createClient();
                        const { data, error } = await supabase.rpc('test_user_rls_policies');
                        
                        if (error) throw error;
                        
                        console.log('RLS Policy Test Results:', data);
                        alert('RLS Policy Test Results: ' + JSON.stringify(data, null, 2));
                      } catch (err: any) {
                        console.error('Error testing RLS policies:', err);
                        setError(err.message || 'Error testing RLS policies');
                      }
                    }}
                    className="px-3 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:hover:bg-yellow-700 dark:text-yellow-100 rounded"
                  >
                    Test RLS Policies
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        const supabase = createClient();
                        const { data, error } = await supabase.rpc('get_user_records', { p_table_name: 'jobs' });
                        
                        if (error) throw error;
                        
                        console.log('User Jobs:', data);
                        alert('User Jobs: ' + JSON.stringify(data, null, 2));
                      } catch (err: any) {
                        console.error('Error fetching user jobs:', err);
                        setError(err.message || 'Error fetching user jobs');
                      }
                    }}
                    className="ml-2 px-3 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:hover:bg-indigo-700 dark:text-indigo-100 rounded"
                  >
                    View My Jobs
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        const supabase = createClient();
                        const { data, error } = await supabase.rpc('get_user_records', { p_table_name: 'resumes' });
                        
                        if (error) throw error;
                        
                        console.log('User Resumes:', data);
                        alert('User Resumes: ' + JSON.stringify(data, null, 2));
                      } catch (err: any) {
                        console.error('Error fetching user resumes:', err);
                        setError(err.message || 'Error fetching user resumes');
                      }
                    }}
                    className="ml-2 px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-800 dark:hover:bg-green-700 dark:text-green-100 rounded"
                  >
                    View My Resumes
                  </button>
                </div>
              </details>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Position
                  </label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Job Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={10}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Paste the job description here..."
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  The full job description will help us analyze your resume against this job.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard/jobs"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 