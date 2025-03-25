export interface User {
  id: string;
  email: string | undefined;
  stripe_customer_id?: string;
  default_resume_id?: string;
  job_search_goal?: number;
  is_anonymous?: boolean;
  anonymous_expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Job {
  id: string;
  user_id?: string;
  company: string;
  title: string;
  location?: string;
  description?: string;
  
  // Additional structured fields for AI extraction
  job_type?: string;                    // Full-time, Part-time, Contract, etc.
  salary_range_min?: number;           // Minimum salary amount
  salary_range_max?: number;           // Maximum salary amount
  salary_currency?: string;             // USD, EUR, etc.
  salary_period?: string;               // yearly, monthly, hourly
  
  requirements?: string[];              // Array of requirement strings
  benefits?: string[];                  // Array of benefit strings
  
  // AI processing metadata
  raw_job_text?: string;                // Original pasted job description
  ai_confidence?: Record<string, number>; // Confidence scores for each extracted field
  ai_version?: string;                  // Version of AI model used for extraction
  ai_processed_at?: string;             // When AI processing occurred
  
  status?: string;
  applied_date?: string;
  created_at?: string;
  updated_at?: string;
  
  // For displaying job scans - used in UI
  job_scans?: JobScan[];
  latest_scan?: JobScan;
  scans?: JobScan[];
}

// Process Job Listing API interfaces
export interface ProcessJobListingRequest {
  text: string;
}

export interface ProcessJobListingResponse {
  success: boolean;
  data: Omit<Job, 'id' | 'user_id' | 'status' | 'applied_date' | 'created_at' | 'updated_at'>;
}

export interface Resume {
  id: string;
  user_id?: string;
  filename: string;
  file_path?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  created_at?: string;
  updated_at?: string;
  is_default?: boolean;
}

export interface JobScan {
  id: string;
  user_id?: string;
  job_id: string;
  resume_id: string;
  credit_purchase_id?: string;
  resume_filename?: string;
  job_posting?: string;
  created_at?: string;
  status: string;
  results?: any;
  match_score?: number;
  error_message?: string;
  
  // Additional structured data extracted from results JSONB
  overall_match?: string;
  hard_skills?: string;
  soft_skills?: string;
  experience_match?: string;
  qualifications?: string;
  missing_keywords?: string;
  
  // Category scores and feedback
  category_scores?: {
    searchability: number;
    hardSkills: number;
    softSkills: number;
    recruiterTips: number;
    formatting: number;
    [key: string]: number;
  };
  
  category_feedback?: {
    searchability: string[];
    contactInfo: string[];
    summary: string[];
    sectionHeadings: string[];
    jobTitleMatch: string[];
    dateFormatting: string[];
    [key: string]: string[];
  };
  
  jobs?: {
    id: string;
    title: string;
    company: string;
  };
}

export interface CreditPurchase {
  id: string;
  user_id: string;
  credit_amount: number;
  remaining_credits: number;
  stripe_session_id?: string;
  purchase_date: string;
  expires_at?: string;
  created_at?: string;
}

export interface CreditUsage {
  id: string;
  purchase_id: string;
  user_id: string;
  scan_id: string;
  request_payload?: any;
  response_payload?: any;
  http_status?: number;
  created_at?: string;
}

/**
 * Used for testing purposes
 */
export interface TestUser {
  id: string;
  email: string;
  password: string;
} 