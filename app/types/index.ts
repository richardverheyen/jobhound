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
  position: string;
  location?: string;
  description?: string;
  status: string;
  applied_date: string;
  created_at?: string;
  updated_at?: string;
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