import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { createClient } from "../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

// Define a schema for the ATS analysis response
const atsSchema = z.object({
  overallMatch: z.string(),
  hardSkills: z.string(),
  softSkills: z.string(),
  experienceMatch: z.string(),
  qualifications: z.string(),
  missingKeywords: z.string(),
  matchScore: z.number().min(0).max(100),
});

type ATSResponse = z.infer<typeof atsSchema>;

export async function POST(req: NextRequest) {
  try {
    // Check for Google API key
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      console.error(
        "Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable"
      );
      return NextResponse.json(
        { error: "Server configuration error: Missing AI API key" },
        { status: 500 }
      );
    }

    // Get the user's API key from the request headers
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 401 }
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
        { status: 403 }
      );
    }

    // Parse the request body
    const formData = await req.formData();
    const jobPosting = formData.get("jobPosting");
    const resumeFile = formData.get("resume") as File;
    const scanId = formData.get("scanId") as string;
    const jobId = formData.get("jobId") as string;
    const resumeId = formData.get("resumeId") as string;

    if (!jobPosting || !resumeFile || !scanId || !jobId || !resumeId) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();

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
              resume_filename: resumeFile.name,
              timestamp: timestamp,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          "Error updating user credits. Status:",
          response.status,
          "Error:",
          errorData
        );
        return NextResponse.json(
          { error: "Failed to process credits. Please try again." },
          { status: 500 }
        );
      }
    } catch (updateError) {
      console.error(
        "Error calling update-credits-metadata function:",
        updateError
      );
      return NextResponse.json(
        { error: "Failed to process credits. Please try again." },
        { status: 500 }
      );
    }

    // Store the job scan record
    const { error: scanError } = await supabase.from("job_scans").insert({
      id: scanId,
      user_id: userData.user_id,
      job_posting: jobPosting,
      resume_filename: resumeFile.name,
      created_at: timestamp,
      status: "processing",
      job_id: jobId,
      resume_id: resumeId,
    });

    if (scanError) {
      console.error("Error creating scan record:", scanError);
      return NextResponse.json(
        { error: "Failed to create scan record" },
        { status: 500 }
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

    try {
      // Convert the resume file to ArrayBuffer for AI processing
      const resumeBuffer = await resumeFile.arrayBuffer();
      const resumePDF = new Uint8Array(resumeBuffer);

      // Create the stream with schema validation
      const result = streamObject({
        model: google("gemini-1.5-pro-latest"),
        messages: [
          {
            role: "system",
            content: `You are an ATS analyzer focused on providing concise, actionable feedback. Compare the resume to the job posting and provide scores and brief insights for key areas. Keep all analysis short and mobile-friendly - each section should be 1-2 sentences maximum. Focus on the most important matches and gaps.

Key points to analyze:
- Overall match and key takeaways
- Essential hard skills (technical skills, tools)
- Critical soft skills
- Experience level match
- Must-have qualifications
- Key missing keywords`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this resume against the following job posting:\n${jobPosting}`,
              },
              {
                type: "file",
                data: resumePDF,
                mimeType: "application/pdf",
              },
            ],
          },
        ],
        schema: atsSchema,
        output: "object",
        temperature: 0.3,
        onFinish: async ({ object }) => {
          console.log("Analysis completed for scan:", scanId);
          console.log("Final object:", object);

          try {
            // Validate the response against our schema
            const validatedResponse = atsSchema.parse(object);

            // Update the scan record with the results
            await supabase
              .from("job_scans")
              .update({
                results: validatedResponse,
                status: "completed",
                match_score: validatedResponse.matchScore,
              })
              .eq("id", scanId);
          } catch (error) {
            console.error("Schema validation error:", error);
            await supabase
              .from("job_scans")
              .update({
                status: "error",
                error_message: "Failed to validate analysis results",
              })
              .eq("id", scanId);
          }
        },
      });

      // Create headers for the response
      const headers = new Headers();
      headers.set("Content-Type", "text/plain; charset=utf-8");
      headers.set("Transfer-Encoding", "chunked");
      headers.set("x-scan-id", scanId);

      // Convert the object stream to a text stream response
      const streamResponse = await result.toTextStreamResponse();

      // Return the streaming response
      return new Response(streamResponse.body, {
        headers,
      });
    } catch (aiError: any) {
      console.error("AI processing error:", aiError);

      // Update the scan record with the error
      await supabase
        .from("job_scans")
        .update({
          status: "error",
          error_message: aiError?.message || "Error processing with AI model",
        })
        .eq("id", scanId);

      return NextResponse.json(
        {
          error: "Failed to process with AI model. Please try again.",
          details: aiError?.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        error: "An error occurred while processing your request",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
