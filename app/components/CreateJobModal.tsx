'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import { JobFormContent, useJobForm } from '@/app/components/JobFormContent';

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
  // const router = useRouter();
  // // Use our shared job form hook
  // const {
  //   activeTab,
  //   setActiveTab,
  //   isSubmitting,
  //   setIsSubmitting,
  //   error,
  //   setError,
  //   isProcessingAI,
  //   setIsProcessingAI,
  //   rawJobText,
  //   setRawJobText,
  //   formData,
  //   setFormData,
  //   handleTabChange,
  //   handleFormChange,
  //   processJobListing,
  //   handleRawTextChange,
  //   validateForm,
  //   handleAddRequirement,
  //   handleRemoveRequirement,
  //   newRequirement,
  //   setNewRequirement,
  //   handleAddBenefit,
  //   handleRemoveBenefit,
  //   newBenefit,
  //   setNewBenefit,
  //   handleAddHardSkill,
  //   handleRemoveHardSkill,
  //   newHardSkill,
  //   setNewHardSkill,
  //   handleAddSoftSkill,
  //   handleRemoveSoftSkill,
  //   newSoftSkill,
  //   setNewSoftSkill,
  //   resetForm
  // } = useJobForm();

  // // Reset form when modal is opened/closed
  // useEffect(() => {
  //   if (!isOpen) {
  //     resetForm();
  //   }
  // }, [isOpen, resetForm]);

  // // Handle escape key to close modal
  // useEffect(() => {
  //   const handleEscape = (e: KeyboardEvent) => {
  //     if (e.key === 'Escape' && !isSubmitting && !isProcessingAI) onClose();
  //   };
    
  //   document.addEventListener('keydown', handleEscape);
  //   return () => document.removeEventListener('keydown', handleEscape);
  // }, [onClose, isSubmitting, isProcessingAI]);

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
    
  //   // Validate form
  //   const validationErrors = validateForm();
  //   if (validationErrors.length > 0) {
  //     setError(validationErrors.join(". "));
  //     return;
  //   }
    
  //   setIsSubmitting(true);
  //   setError(null);
    
  //   try {
  //     // Get the current user
  //     const { data: { user } } = await supabase.auth.getUser();
      
  //     if (!user) {
  //       throw new Error('You must be logged in to create a job');
  //     }
      
  //     // Ensure requirements and benefits are arrays
  //     const requirements = Array.isArray(formData.requirements) 
  //       ? formData.requirements 
  //       : (formData.requirements ? [formData.requirements] : []);
        
  //     const benefits = Array.isArray(formData.benefits)
  //       ? formData.benefits
  //       : (formData.benefits ? [formData.benefits] : []);
      
  //     const hardSkills = Array.isArray(formData.hard_skills)
  //       ? formData.hard_skills
  //       : (formData.hard_skills ? [formData.hard_skills] : []);
        
  //     const softSkills = Array.isArray(formData.soft_skills)
  //       ? formData.soft_skills
  //       : (formData.soft_skills ? [formData.soft_skills] : []);
      
  //     // Use the updated create_job RPC function with all fields
  //     const { data, error } = await supabase
  //       .rpc('create_job', {
  //         p_company: formData.company,
  //         p_title: formData.title,
  //         p_location: formData.location,
  //         p_description: formData.description,
  //         p_job_type: formData.job_type,
  //         p_salary_range_min: formData.salary_range_min,
  //         p_salary_range_max: formData.salary_range_max,
  //         p_salary_currency: formData.salary_currency,
  //         p_salary_period: formData.salary_period,
  //         p_requirements: requirements.length > 0 
  //           ? requirements 
  //           : null,
  //         p_benefits: benefits.length > 0 
  //           ? benefits 
  //           : null,
  //         p_hard_skills: hardSkills.length > 0
  //           ? hardSkills
  //           : null,
  //         p_soft_skills: softSkills.length > 0
  //           ? softSkills
  //           : null,
  //         p_raw_job_text: activeTab === 'ai' ? rawJobText : formData.raw_job_text
  //       });
      
  //     if (error) {
  //       throw error;
  //     }
      
  //     // Call onSuccess with the job ID if provided
  //     if (onSuccess && data?.job_id) {
  //       onSuccess(data.job_id);
  //     }
      
  //     // Close the modal
  //     onClose();
      
  //     // Navigate if needed and we have the job ID
  //     if (navigateToJobOnSuccess && data?.job_id) {
  //       router.push(`/dashboard/jobs/${data.job_id}`);
  //     }
  //   } catch (error: any) {
  //     console.error('Error submitting job data:', error);
  //     setError(error.message || 'An error occurred while creating the job');
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  // if (!isOpen) return null;

  return (
    <button>Foo</button>
  );
} 