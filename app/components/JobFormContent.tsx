'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';

// Define the full job data structure based on the database schema
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

// Type for the job form props
export interface JobFormContentProps {
  activeTab: 'ai' | 'manual';
  setActiveTab: (tab: 'ai' | 'manual') => void;
  isSubmitting: boolean;
  error: string | null;
  isProcessingAI: boolean;
  rawJobText: string;
  formData: JobFormData;
  handleTabChange: (tab: 'ai' | 'manual') => void;
  handleFormChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleRawTextChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleAddRequirement: () => void;
  handleRemoveRequirement: (index: number) => void;
  newRequirement: string;
  setNewRequirement: (value: string) => void;
  handleAddBenefit: () => void;
  handleRemoveBenefit: (index: number) => void;
  newBenefit: string;
  setNewBenefit: (value: string) => void;
  handleAddHardSkill: () => void;
  handleRemoveHardSkill: (index: number) => void;
  newHardSkill: string;
  setNewHardSkill: (value: string) => void;
  handleAddSoftSkill: () => void;
  handleRemoveSoftSkill: (index: number) => void;
  newSoftSkill: string;
  setNewSoftSkill: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isModal?: boolean;
}

// Hook to manage job form state and operations
export function useJobForm() {
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

  // Refs to track component mount status and processing state
  const isMounted = useRef(true);
  const processingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Reset the form to initial state
  const resetForm = () => {
    setFormData({
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
    setRawJobText('');
    setError(null);
    setActiveTab('ai');
    setIsProcessingAI(false);
    setNewRequirement('');
    setNewBenefit('');
    setNewHardSkill('');
    setNewSoftSkill('');
  };

  const handleTabChange = (tab: 'ai' | 'manual') => {
    if (!isSubmitting && !isProcessingAI) {
      setActiveTab(tab);
    }
  };

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
    debounce(processJobListing, 1000) // 1 second delay
  ).current;

  const handleRawTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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

  return {
    activeTab,
    setActiveTab,
    isSubmitting,
    setIsSubmitting,
    error,
    setError,
    isProcessingAI,
    setIsProcessingAI,
    rawJobText,
    setRawJobText,
    formData,
    setFormData,
    handleTabChange,
    handleFormChange,
    processJobListing,
    handleRawTextChange,
    validateForm,
    handleAddRequirement,
    handleRemoveRequirement,
    newRequirement,
    setNewRequirement,
    handleAddBenefit,
    handleRemoveBenefit,
    newBenefit,
    setNewBenefit,
    handleAddHardSkill,
    handleRemoveHardSkill,
    newHardSkill,
    setNewHardSkill,
    handleAddSoftSkill,
    handleRemoveSoftSkill,
    newSoftSkill,
    setNewSoftSkill,
    resetForm
  };
}

// The shared job form component
export function JobFormContent({
  activeTab,
  setActiveTab,
  isSubmitting,
  error,
  isProcessingAI,
  rawJobText,
  formData,
  handleTabChange,
  handleFormChange,
  handleRawTextChange,
  handleAddRequirement,
  handleRemoveRequirement,
  newRequirement,
  setNewRequirement,
  handleAddBenefit,
  handleRemoveBenefit,
  newBenefit,
  setNewBenefit,
  handleAddHardSkill,
  handleRemoveHardSkill,
  newHardSkill,
  setNewHardSkill,
  handleAddSoftSkill,
  handleRemoveSoftSkill,
  newSoftSkill,
  setNewSoftSkill,
  onSubmit,
  onCancel,
  isModal = false
}: JobFormContentProps) {
  // Add state to track if the component has mounted
  const [isMounted, setIsMounted] = useState(false);
  
  // Use a ref to prevent global event listeners from affecting the component
  const componentRef = useRef<HTMLDivElement>(null);

  // Handle React's synthetic events within the component
  useEffect(() => {
    setIsMounted(true);

    // Function to prevent clicks inside this component from bubbling up
    const handleGlobalClick = (e: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(e.target as Node)) {
        // Click was outside our component, do nothing
        return;
      }
      
      // Check if click is on a link or button outside our form elements
      const target = e.target as HTMLElement;
      const isLink = target.tagName === 'A' || 
                     target.closest('a') || 
                     target.tagName === 'BUTTON' || 
                     target.closest('button');
      
      if (isLink && !target.closest('form') && !target.closest('[data-testid]')) {
        // Let normal links and buttons work
        return;
      }
      
      // For other elements inside our component, don't interfere
      e.stopPropagation();
    };

    // Add low-level event listeners to catch events that might be causing issues
    document.addEventListener('mousedown', handleGlobalClick, true);
    document.addEventListener('click', handleGlobalClick, true);
    
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick, true);
      document.removeEventListener('click', handleGlobalClick, true);
      setIsMounted(false);
    };
  }, []);

  if (!isMounted) {
    return null; // Return null on server or before mount to avoid hydration issues
  }

  return (
    <div 
      ref={componentRef} 
      style={{ 
        position: 'relative', 
        zIndex: isModal ? 100 : 'auto',
        isolation: 'isolate' // Create a stacking context
      }}
    >
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
            {isModal && (
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
        <form onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} className="space-y-4 mt-4">
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
          
          {/* Form Actions */}
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
            <button
              type="button"
              onClick={() => handleTabChange('ai')}
              disabled={isSubmitting}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 