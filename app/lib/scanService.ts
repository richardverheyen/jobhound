import { createBrowserClient } from "@/lib/supabase/client";
import { JobScan } from "@/types";

interface CreateScanParams {
  jobId: string;
  resumeId: string;
  resumeFile?: File;
  resumeFilename?: string;
}

export async function createScan({
  jobId,
  resumeId,
  resumeFile,
  resumeFilename,
}: CreateScanParams): Promise<{ 
  success: boolean; 
  scanId?: string; 
  redirectUrl?: string;
  matchScore?: number;
  error?: string;
}> {
  try {
    const supabase = createBrowserClient();
    
    // Get the authenticated user
    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session) {
      throw new Error("You must be logged in to create a scan");
    }

    // Create request payload
    let requestPayload: any;
    let response;
    
    // Build the URL for the edge function
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-scan`;
    console.log("Calling Supabase Edge Function:", functionUrl);

    // If we have a resume file, use FormData to send it
    if (resumeFile) {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("resumeId", resumeId);
      formData.append("resume", resumeFile);
      
      try {
        // Call the Edge Function with FormData
        response = await fetch(functionUrl, {
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
        throw new Error(`Failed to connect to the edge function: ${error.message || 'Unknown error'}`);
      }
    } else {
      // If no file, send JSON payload
      requestPayload = {
        jobId,
        resumeId,
        resumeFilename,
      };
      
      try {
        // Call the Edge Function with JSON
        response = await fetch(functionUrl, {
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
        throw new Error(`Failed to connect to the edge function: ${error.message || 'Unknown error'}`);
      }
    }

    // Check for successful response
    if (!response.ok) {
      console.error("Edge function response not OK:", response.status, response.statusText);
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
    console.log("Edge function response:", data);

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
    const supabase = createBrowserClient();
    
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
    const supabase = createBrowserClient();
    
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