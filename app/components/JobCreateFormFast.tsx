"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";
import { JobSummary } from "./JobSummary";
import { Job } from "@/types";
import { Button } from '@radix-ui/themes';

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

interface JobCreateFormFastProps {
  onSuccess?: (jobId: string) => void;
  navigateToJobOnSuccess?: boolean;
  onCancel?: () => void;
}

export default function JobCreateFormFast({
  onSuccess,
  navigateToJobOnSuccess = true,
  onCancel,
}: JobCreateFormFastProps) {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "review">("input");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJobText, setRawJobText] = useState("");
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  // Full form data for job creation
  const [formData, setFormData] = useState<JobFormData>({
    company: "",
    title: "",
    location: "",
    description: "",
    job_type: "",
    salary_range_min: undefined,
    salary_range_max: undefined,
    salary_currency: "",
    salary_period: "",
    requirements: [],
    benefits: [],
    hard_skills: [],
    soft_skills: [],
    raw_job_text: "",
  });

  // Debounce function
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

  const createJob = async (jobData: JobFormData) => {
    try {
      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to create a job");
      }

      // Ensure requirements and benefits are arrays
      const requirements = Array.isArray(jobData.requirements)
        ? jobData.requirements
        : jobData.requirements
        ? [jobData.requirements]
        : [];

      const benefits = Array.isArray(jobData.benefits)
        ? jobData.benefits
        : jobData.benefits
        ? [jobData.benefits]
        : [];

      const hardSkills = Array.isArray(jobData.hard_skills)
        ? jobData.hard_skills
        : jobData.hard_skills
        ? [jobData.hard_skills]
        : [];

      const softSkills = Array.isArray(jobData.soft_skills)
        ? jobData.soft_skills
        : jobData.soft_skills
        ? [jobData.soft_skills]
        : [];

      // Use the create_job RPC function
      const { data, error } = await supabase.rpc("create_job", {
        p_company: jobData.company,
        p_title: jobData.title,
        p_location: jobData.location,
        p_description: jobData.description,
        p_job_type: jobData.job_type,
        p_salary_range_min: jobData.salary_range_min,
        p_salary_range_max: jobData.salary_range_max,
        p_salary_currency: jobData.salary_currency,
        p_salary_period: jobData.salary_period,
        p_requirements: requirements.length > 0 ? requirements : null,
        p_benefits: benefits.length > 0 ? benefits : null,
        p_hard_skills: hardSkills.length > 0 ? hardSkills : null,
        p_soft_skills: softSkills.length > 0 ? softSkills : null,
        p_raw_job_text: jobData.raw_job_text,
      });

      if (error) {
        throw error;
      }

      // Store the created job ID
      if (data?.job_id) {
        setCreatedJobId(data.job_id);
      }

      return data?.job_id;
    } catch (error: any) {
      console.error("Error creating job:", error);
      throw error;
    }
  };

  const deleteJob = async () => {
    if (!createdJobId) return;

    try {
      // Add loading state if needed
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", createdJobId);

      if (error) {
        throw error;
      }

      setCreatedJobId(null);
      // Deletion successful
      return true;
    } catch (error) {
      console.error("Error deleting job:", error);
      // Could add error message here if needed
      // setError("Failed to delete job. Please try again.");
      return false;
    }
  };

  const processJobListing = async (text: string) => {
    if (processingRef.current || !isMounted.current || text.length < 50) return;

    try {
      processingRef.current = true;
      setIsProcessingAI(true);
      setError(null);

      // Call the API to process the text
      const response = await fetch("/api/process-job-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!isMounted.current) return;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process job listing");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to extract job data");
      }

      // Update form with AI extracted data
      const processedData = {
        ...data.data,
        raw_job_text: text,
      };

      setFormData(processedData);

      // Automatically create the job
      const jobId = await createJob(processedData);

      // Call onSuccess if provided
      if (onSuccess && jobId) {
        onSuccess(jobId);
      }

      // Move to review step
      setStep("review");
    } catch (error: any) {
      console.error("Error processing job text with AI:", error);
      setError(
        error.message || "Failed to process job text. Please try again."
      );
    } finally {
      processingRef.current = false;
      if (isMounted.current) {
        setIsProcessingAI(false);
      }
    }
  };

  // Create a debounced version of the process function
  const debouncedProcessJobListing = useRef(
    debounce(processJobListing, 500) // 0.5 second delay
  ).current;

  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRawJobText(value);

    // Use the debounced function to process the text
    if (value.length > 50) {
      debouncedProcessJobListing(value);
    }
  };

  const handleBackToInput = async () => {
    // Delete the created job and wait for completion
    if (createdJobId) {
      const deleted = await deleteJob();
      
      // If deletion failed, you could handle that here if needed
      // if (!deleted) {
      //   setError("Failed to delete job. Please try again.");
      //   return;
      // }
    }

    // Reset form data
    setFormData({
      company: "",
      title: "",
      location: "",
      description: "",
      job_type: "",
      salary_range_min: undefined,
      salary_range_max: undefined,
      salary_currency: "",
      salary_period: "",
      requirements: [],
      benefits: [],
      hard_skills: [],
      soft_skills: [],
      raw_job_text: "",
    });
    
    // Clear any previous text/error
    setRawJobText("");
    setError(null);

    // Go back to input step
    setStep("input");
  };

  // Input step view
  if (step === "input") {
    return (
      <div className="flex flex-grow flex-col h-full">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex-grow flex flex-col">
          <div className="relative flex-grow flex flex-col">
            <textarea
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full h-full p-1.5 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md min-h-[300px] flex-grow"
              value={rawJobText}
              onChange={handleRawTextChange}
              disabled={isProcessingAI}
              placeholder="Copy/paste your unedited job listing data here, and we'll scrape the useful stuff with AI"
              data-testid="raw-job-text-input"
            />

            {isProcessingAI && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex items-center justify-center rounded-md">
                <div className="flex flex-col items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="mt-2 text-sm font-medium text-blue-500">
                    Processing with AI...
                  </span>
                </div>
              </div>
            )}
          </div>

          {onCancel && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={onCancel}
                disabled={isProcessingAI}
                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Review step view
  return (
    <div className="relative">
      {/* Back button */}
      <Button
        onClick={handleBackToInput}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10"
        aria-label="Go back"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </Button>

      <JobSummary job={formData as Job} className="p-6" />
    </div>
  );
}
