import { Job } from '@/types';

interface JobSummaryProps {
  job: Job;
  className?: string;
}

export const JobSummary = ({ job, className = "" }: JobSummaryProps) => {
  return (
    <div className={`relative bg-white dark:bg-gray-800 shadow rounded-lg space-y-4 ${className}`}>
      {/* Title and important job details at the top */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          {job.title}
        </h2>
        {job.job_type && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
            {job.job_type}
          </p>
        )}

        {/* Two column layout for company and location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Company
            </p>
            <p className="text-sm text-gray-900 dark:text-white font-medium">
              {job.company}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Location
            </p>
            <p className="text-sm text-gray-900 dark:text-white">
              {job.location || "Not specified"}
            </p>
          </div>
        </div>
      </div>

      {/* Salary information */}
      {(job.salary_range_min || job.salary_range_max) && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Salary Range
          </h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            {job.salary_range_min !== undefined &&
            job.salary_range_max !== undefined
              ? `${
                  job.salary_currency ? job.salary_currency + " " : ""
                }${job.salary_range_min.toLocaleString()} - ${
                  job.salary_currency ? job.salary_currency + " " : ""
                }${job.salary_range_max.toLocaleString()} ${
                  job.salary_period ? `(${job.salary_period})` : ""
                }`
              : job.salary_range_min !== undefined
              ? `${
                  job.salary_currency ? job.salary_currency + " " : ""
                }${job.salary_range_min.toLocaleString()} ${
                  job.salary_period ? `(${job.salary_period})` : ""
                } minimum`
              : job.salary_range_max !== undefined
              ? `${
                  job.salary_currency ? job.salary_currency + " " : ""
                }${job.salary_range_max.toLocaleString()} ${
                  job.salary_period ? `(${job.salary_period})` : ""
                } maximum`
              : "Salary details not available"}
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Job Description
        </h3>
        <div className="mt-2 text-sm text-gray-900 dark:text-white whitespace-pre-line">
          {job.description}
        </div>
      </div>

      {job.requirements && job.requirements.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Requirements
          </h3>
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
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Benefits
          </h3>
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
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Hard Skills
          </h3>
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
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Soft Skills
          </h3>
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
  );
}; 