'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import { JobFormContent, JobFormData, useJobForm } from './JobFormContent';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (jobId: string) => void;
  navigateToJobOnSuccess?: boolean;
}

export default function CreateJobModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  navigateToJobOnSuccess = true 
}: CreateJobModalProps) {
  const router = useRouter();
  // Use our shared job form hook
  const {
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
  } = useJobForm();

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isProcessingAI) onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting, isProcessingAI]);

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
      
      // Close the modal
      onClose();
      
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ease-out"
          onClick={(isSubmitting || isProcessingAI) ? undefined : onClose}
          aria-hidden="true"
          style={{ opacity: isOpen ? 0.5 : 0 }}
        ></div>

        {/* Modal panel */}
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-out sm:my-8 sm:align-middle sm:max-w-lg w-full"
          style={{ 
            transform: isOpen ? 'translateY(0)' : 'translateY(50px)', 
            opacity: isOpen ? 1 : 0
          }}
        >
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start w-full">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Add New Job
                  </h3>
                  <button
                    onClick={(isSubmitting || isProcessingAI) ? undefined : onClose}
                    disabled={isSubmitting || isProcessingAI}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <JobFormContent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSubmitting={isSubmitting}
                  error={error}
                  isProcessingAI={isProcessingAI}
                  rawJobText={rawJobText}
                  formData={formData}
                  handleTabChange={handleTabChange}
                  handleFormChange={handleFormChange}
                  handleRawTextChange={handleRawTextChange}
                  handleAddRequirement={handleAddRequirement}
                  handleRemoveRequirement={handleRemoveRequirement}
                  newRequirement={newRequirement}
                  setNewRequirement={setNewRequirement}
                  handleAddBenefit={handleAddBenefit}
                  handleRemoveBenefit={handleRemoveBenefit}
                  newBenefit={newBenefit}
                  setNewBenefit={setNewBenefit}
                  handleAddHardSkill={handleAddHardSkill}
                  handleRemoveHardSkill={handleRemoveHardSkill}
                  newHardSkill={newHardSkill}
                  setNewHardSkill={setNewHardSkill}
                  handleAddSoftSkill={handleAddSoftSkill}
                  handleRemoveSoftSkill={handleRemoveSoftSkill}
                  newSoftSkill={newSoftSkill}
                  setNewSoftSkill={setNewSoftSkill}
                  onSubmit={handleSubmit}
                  onCancel={onClose}
                  isModal={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 