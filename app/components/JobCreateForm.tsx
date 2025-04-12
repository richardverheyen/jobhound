'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';

// Define the job form data structure based on the database schema
export interface JobFormData {
  company: string;
  title: string;
  location: string;
  description: string;
  job_type: string;
  salary_range_min?: number;
  salary_range_max?: number;
  salary_currency?: string;
  salary_period?: string;
  requirements?: string[];
  benefits?: string[];
  hard_skills?: string[];
  soft_skills?: string[];
  raw_job_text?: string;
}

interface JobCreateFormProps {
  onSuccess?: (jobId: string) => void;
  navigateToJobOnSuccess?: boolean;
  onCancel?: () => void;
}

export default function JobCreateForm({ 
  onSuccess, 
  navigateToJobOnSuccess = true,
  onCancel
}: JobCreateFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [rawJobText, setRawJobText] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newHardSkill, setNewHardSkill] = useState('');
  const [newSoftSkill, setNewSoftSkill] = useState('');
  
  // Full form data for job creation
  const [formData, setFormData] = useState<JobFormData>({
    company: '',
    title: '',
    location: '',
    description: '',
    job_type: '',
    salary_range_min: undefined,
    salary_range_max: undefined,
    salary_currency: '',
    salary_period: '',
    requirements: [],
    benefits: [],
    hard_skills: [],
    soft_skills: [],
    raw_job_text: '',
  });

  const handleTabChange = (tab: 'ai' | 'manual') => {
    if (!isSubmitting && !isProcessingAI) {
      setActiveTab(tab);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'salary_range_min' || name === 'salary_range_max') {
      const numValue = value === '' ? undefined : parseInt(value, 10);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Add a debounce function
  const debounce = <T extends (...args: any[]) => any>(
    callback: T,
    delay: number
  ) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback(...args);
      }, delay);
    };
  };

  // Refs to track if component is mounted and API call in progress
  const isMounted = useRef(true);
  const processingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const processJobListing = async (text: string) => {
    if (processingRef.current || !isMounted.current) return;
    
    // Only process with AI if we have substantial text (more than 50 chars)
    if (text.length > 50) {
      try {
        processingRef.current = true;
        setIsProcessingAI(true);
        
        // Call the Vercel Edge function to process the text
        const response = await fetch('/api/process-job-listing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        
        if (!isMounted.current) return;
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process job listing');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to extract job data');
        }
        
        // Update form with AI extracted data
        setFormData({
          ...data.data,
          raw_job_text: text
        });
        
        // Switch to manual tab to review data
        setActiveTab('manual');
      } catch (error: any) {
        console.error('Error processing job text with AI:', error);
        setError(error.message || 'Failed to process job text. Please try again or enter details manually.');
      } finally {
        processingRef.current = false;
        if (isMounted.current) {
          setIsProcessingAI(false);
        }
      }
    }
  };

  // Create a debounced version of the process function
  const debouncedProcessJobListing = useRef(
    debounce(processJobListing, 100) // 100ms second delay
  ).current;

  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRawJobText(value);
    
    // Use the debounced function to process the text
    debouncedProcessJobListing(value);
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!formData.company) errors.push("Company name is required");
    if (!formData.title) errors.push("Job title is required");
    if (!formData.description) errors.push("Job description is required");
    
    if (formData.salary_range_min && formData.salary_range_max) {
      if (formData.salary_range_min > formData.salary_range_max) {
        errors.push("Minimum salary cannot be greater than maximum salary");
      }
    }
    
    if ((formData.salary_range_min || formData.salary_range_max) && 
        (!formData.salary_currency || !formData.salary_period)) {
      errors.push("Please provide currency and period for salary information");
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(". "));
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a job');
      }
      
      // Ensure requirements and benefits are arrays
      const requirements = Array.isArray(formData.requirements) 
        ? formData.requirements 
        : (formData.requirements ? [formData.requirements] : []);
        
      const benefits = Array.isArray(formData.benefits)
        ? formData.benefits
        : (formData.benefits ? [formData.benefits] : []);
      
      const hardSkills = Array.isArray(formData.hard_skills)
        ? formData.hard_skills
        : (formData.hard_skills ? [formData.hard_skills] : []);
        
      const softSkills = Array.isArray(formData.soft_skills)
        ? formData.soft_skills
        : (formData.soft_skills ? [formData.soft_skills] : []);
      
      // Use the updated create_job RPC function with all fields
      const { data, error } = await supabase
        .rpc('create_job', {
          p_company: formData.company,
          p_title: formData.title,
          p_location: formData.location,
          p_description: formData.description,
          p_job_type: formData.job_type,
          p_salary_range_min: formData.salary_range_min,
          p_salary_range_max: formData.salary_range_max,
          p_salary_currency: formData.salary_currency,
          p_salary_period: formData.salary_period,
          p_requirements: requirements.length > 0 
            ? requirements 
            : null,
          p_benefits: benefits.length > 0 
            ? benefits 
            : null,
          p_hard_skills: hardSkills.length > 0
            ? hardSkills
            : null,
          p_soft_skills: softSkills.length > 0
            ? softSkills
            : null,
          p_raw_job_text: activeTab === 'ai' ? rawJobText : formData.raw_job_text
        });
      
      if (error) {
        throw error;
      }
      
      // Call onSuccess with the job ID if provided
      if (onSuccess && data?.job_id) {
        onSuccess(data.job_id);
      }
      
      // Navigate if needed and we have the job ID
      if (navigateToJobOnSuccess && data?.job_id) {
        router.push(`/dashboard/jobs/${data.job_id}`);
      }
    } catch (error: any) {
      console.error('Error submitting job data:', error);
      setError(error.message || 'An error occurred while creating the job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      const updatedRequirements = Array.isArray(formData.requirements) 
        ? [...formData.requirements, newRequirement.trim()]
        : [newRequirement.trim()];
      
      setFormData(prev => ({
        ...prev,
        requirements: updatedRequirements
      }));
      setNewRequirement('');
    }
  };

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      const updatedBenefits = Array.isArray(formData.benefits) 
        ? [...formData.benefits, newBenefit.trim()]
        : [newBenefit.trim()];
      
      setFormData(prev => ({
        ...prev,
        benefits: updatedBenefits
      }));
      setNewBenefit('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    if (Array.isArray(formData.requirements)) {
      const updatedRequirements = [...formData.requirements];
      updatedRequirements.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        requirements: updatedRequirements
      }));
    }
  };

  const handleRemoveBenefit = (index: number) => {
    if (Array.isArray(formData.benefits)) {
      const updatedBenefits = [...formData.benefits];
      updatedBenefits.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        benefits: updatedBenefits
      }));
    }
  };

  const handleAddHardSkill = () => {
    if (newHardSkill.trim()) {
      const updatedHardSkills = Array.isArray(formData.hard_skills) 
        ? [...formData.hard_skills, newHardSkill.trim()]
        : [newHardSkill.trim()];
      
      setFormData(prev => ({
        ...prev,
        hard_skills: updatedHardSkills
      }));
      setNewHardSkill('');
    }
  };

  const handleRemoveHardSkill = (index: number) => {
    if (Array.isArray(formData.hard_skills)) {
      const updatedHardSkills = [...formData.hard_skills];
      updatedHardSkills.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        hard_skills: updatedHardSkills
      }));
    }
  };

  const handleAddSoftSkill = () => {
    if (newSoftSkill.trim()) {
      const updatedSoftSkills = Array.isArray(formData.soft_skills) 
        ? [...formData.soft_skills, newSoftSkill.trim()]
        : [newSoftSkill.trim()];
      
      setFormData(prev => ({
        ...prev,
        soft_skills: updatedSoftSkills
      }));
      setNewSoftSkill('');
    }
  };

  const handleRemoveSoftSkill = (index: number) => {
    if (Array.isArray(formData.soft_skills)) {
      const updatedSoftSkills = [...formData.soft_skills];
      updatedSoftSkills.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        soft_skills: updatedSoftSkills
      }));
    }
  };

  return (
    <div>
      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mt-4">
        <nav className="-mb-px flex" aria-label="Tabs">
          <button
            className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'ai'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            } ${(isSubmitting || isProcessingAI) ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => handleTabChange('ai')}
            disabled={isSubmitting || isProcessingAI}
            data-testid="ai-tab-button"
          >
            AI Assisted Creation
          </button>
          <button
            className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            } ${(isSubmitting || isProcessingAI) ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => handleTabChange('manual')}
            disabled={isSubmitting || isProcessingAI}
            data-testid="manual-tab-button"
          >
            New Job
          </button>
        </nav>
      </div>
      
      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* AI assisted job entry form */}
      {activeTab === 'ai' && (
        <div className="mt-4">
          <div>
            <label htmlFor="raw_job_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Job Listing
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
              Copy/paste your unedited job listing data here, and we'll scrape the useful stuff with AI
            </p>
            <div className="mt-1 relative">
              <textarea
                id="raw_job_text"
                name="raw_job_text"
                rows={12}
                value={rawJobText}
                onChange={handleRawTextChange}
                disabled={isProcessingAI}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                placeholder="Paste the entire job listing here"
                data-testid="raw-job-text-input"
              />
              {isProcessingAI && (
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex items-center justify-center rounded-md">
                  <div className="flex flex-col items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="mt-2 text-sm font-medium text-blue-500">Processing with AI...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => handleTabChange('manual')}
              disabled={isProcessingAI}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                isProcessingAI
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
              data-testid="continue-to-manual-button"
            >
              Continue
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting || isProcessingAI}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Manual job entry form */}
      {activeTab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Basic Information section */}
          <div className="space-y-4">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleFormChange}
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="e.g., Acme Inc."
                  data-testid="job-company-input"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Position
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="e.g., Software Engineer"
                  data-testid="job-title-input"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="e.g., San Francisco, CA or Remote"
                  data-testid="job-location-input"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="job_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Job Type
              </label>
              <div className="mt-1">
                <select
                  id="job_type"
                  name="job_type"
                  value={formData.job_type}
                  onChange={handleFormChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  data-testid="job-type-input"
                >
                  <option value="">Select job type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Job Description section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Job Description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="Full job description"
                  data-testid="job-description-input"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                isSubmitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              data-testid="create-job-button"
            >
              {isSubmitting ? 'Creating...' : 'Add Job'}
            </button>
            
            {activeTab === 'manual' && (
              <button
                type="button"
                onClick={() => handleTabChange('ai')}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Back
              </button>
            )}
            
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
} 