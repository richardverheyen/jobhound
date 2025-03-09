import { createClient } from "../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Get the user's API key from the request headers
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 401 },
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Verify API key and get user
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, user_id, credits")
      .eq("token_identifier", apiKey)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Check if user has available API calls
    const credits = parseInt(userData.credits || "0");
    if (credits <= 0) {
      return NextResponse.json(
        {
          error: "No API calls available. Please purchase more credits.",
          remaining: 0,
        },
        { status: 403 },
      );
    }

    // Parse the request body
    const {
      scanId,
      jobId,
      resumeId,
      jobPosting,
      resumeFilename,
      resumeUrl,
      timestamp,
    } = await req.json();

    if (!scanId || !jobId || !resumeId || !jobPosting || !resumeFilename) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
        },
        { status: 400 },
      );
    }

    // Decrement the user's API call count using the Edge Function
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-credits-metadata`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            userId: userData.user_id,
            creditsToDecrement: 1,
            metadata: {
              scan_id: scanId,
              resume_filename: resumeFilename,
              timestamp: timestamp,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          "Error updating user credits. Status:",
          response.status,
          "Error:",
          errorData,
        );
        return NextResponse.json(
          { error: "Failed to process credits. Please try again." },
          { status: 500 },
        );
      }
    } catch (updateError) {
      console.error(
        "Error calling update-credits-metadata function:",
        updateError,
      );
      return NextResponse.json(
        { error: "Failed to process credits. Please try again." },
        { status: 500 },
      );
    }

    // Store the job scan record
    const { error: scanError } = await supabase.from("job_scans").insert({
      id: scanId,
      user_id: userData.user_id,
      job_posting: jobPosting,
      resume_filename: resumeFilename,
      created_at: timestamp,
      status: "processing",
      job_id: jobId,
      resume_id: resumeId,
    });

    if (scanError) {
      console.error("Error creating scan record:", scanError);
      return NextResponse.json(
        { error: "Failed to create scan record" },
        { status: 500 },
      );
    }

    // Log the API usage
    const { error: logError } = await supabase.from("api_usage").insert({
      user_id: userData.user_id,
      timestamp: timestamp,
      endpoint: "/api/create-scan",
      status: "success",
      scan_id: scanId,
    });

    if (logError) {
      console.error("Error logging API usage:", logError);
    }

    // Now process the resume with AI
    // This would typically call the analyze function similar to what's in api/analyze/route.ts
    // For now, we'll just return success and update the scan status later

    return NextResponse.json(
      {
        success: true,
        message: "Scan created successfully",
        scanId: scanId,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        error: "An error occurred while processing your request",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
