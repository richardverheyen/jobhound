import { supabase } from "@/supabase/client";
import { JobScan } from "@/types";

interface CreateScanParams {
  jobId: string;
  resumeId: string;
}

export async function createScan({
  jobId,
  resumeId,
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
    const requestPayload = {
      jobId,
      resumeId,
    };
    
    // Build the URL for the NextJS API route
    const apiUrl = `/api/create-scan`;
    console.log("Calling NextJS API route:", apiUrl);

    // Call the API route with JSON
    let response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        cache: 'no-store',
      });
    } catch (error: any) {
      console.error("Fetch error:", error);
      throw new Error(`Failed to connect to the API: ${error.message || 'Unknown error'}`);
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