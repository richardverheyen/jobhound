import { supabase } from "@/supabase/client";
import { JobScan } from "@/types";

interface CreateScanParams {
  jobId: string;
  resumeId: string;
  resumeFile?: File;
  resumeFilename?: string;
  scanId?: string;
}

export async function createScan({
  jobId,
  resumeId,
  resumeFile,
  resumeFilename,
  scanId,
}: CreateScanParams): Promise<{ 
  success: boolean; 
  scanId?: string; 
  redirectUrl?: string;
  matchScore?: number;
  error?: string;
}> {
  try {
    // Get the authenticated user
    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session) {
      throw new Error("You must be logged in to create a scan");
    }

    // Create request payload
    let requestPayload: any;
    let response;
    
    // Build the URL for the NextJS API route (instead of Supabase Edge Function)
    const apiUrl = `/api/create-scan`;
    console.log("Calling NextJS API route:", apiUrl);

    // If we have a resume file, use FormData to send it
    if (resumeFile) {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("resumeId", resumeId);
      if (scanId) formData.append("scanId", scanId);
      formData.append("resume", resumeFile);
      
      try {
        // Call the API route with FormData
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`,
          },
          body: formData,
          // Add cache: 'no-store' to prevent caching issues
          cache: 'no-store',
        });
      } catch (error: any) {
        console.error("Fetch error with FormData:", error);
        throw new Error(`Failed to connect to the API: ${error.message || 'Unknown error'}`);
      }
    } else {
      // If no file, send JSON payload
      requestPayload = {
        jobId,
        resumeId,
        resumeFilename,
        scanId,
      };
      
      try {
        // Call the API route with JSON
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
          // Add cache: 'no-store' to prevent caching issues
          cache: 'no-store',
        });
      } catch (error: any) {
        console.error("Fetch error with JSON payload:", error);
        throw new Error(`Failed to connect to the API: ${error.message || 'Unknown error'}`);
      }
    }

    // Check for successful response
    if (!response.ok) {
      console.error("API response not OK:", response.status, response.statusText);
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || `Request failed with status ${response.status}`;
      } catch (jsonError) {
        errorMessage = `Request failed with status ${response.status}: ${response.statusText}`;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Parse the response
    const data = await response.json();
    console.log("API response:", data);

    // Return with redirect URL for client-side navigation
    return {
      success: true,
      scanId: data.scanId,
      redirectUrl: data.redirectUrl,
      matchScore: data.matchScore,
    };
  } catch (error: any) {
    console.error("Error creating scan:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

export async function getJobScans(jobId: string): Promise<JobScan[]> {
  try {
    // Get scans for a specific job
    const { data, error } = await supabase
      .from("job_scans")
      .select("*, jobs(id, title, company)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching job scans:", error);
    return [];
  }
}

export async function getScanDetails(scanId: string): Promise<JobScan | null> {
  try {
    // Get details for a specific scan
    const { data, error } = await supabase
      .from("job_scans")
      .select("*, jobs(id, title, company)")
      .eq("id", scanId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error fetching scan details:", error);
    return null;
  }
}

export async function fetchUserCredits() {
  try {
    // Get authenticated user ID
    const { data: authData } = await supabase.auth.getSession();
    
    if (!authData?.session?.user?.id) {
      throw new Error("User not authenticated");
    }
    
    // Get user credit information
    const { data, error } = await supabase.rpc("get_user_credit_summary", {
      p_user_id: authData.session.user.id
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return {
      availableCredits: data.available_credits || 0,
      totalPurchased: data.total_purchased || 0,
      totalUsed: data.total_used || 0
    };
  } catch (error) {
    console.error("Error fetching user credits:", error);
    return {
      availableCredits: 0,
      totalPurchased: 0,
      totalUsed: 0
    };
  }
}

export async function getScansForResume(resumeId: string) {
  try {
    const { data, error } = await supabase
      .from("job_scans")
      .select(`
        id,
        created_at,
        match_score,
        job_id,
        resume_id,
        jobs (
          id,
          title,
          company,
          location,
          description,
          status
        )
      `)
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data as unknown as JobScan[];
  } catch (error) {
    console.error("Error getting scans for resume:", error);
    return [];
  }
} 