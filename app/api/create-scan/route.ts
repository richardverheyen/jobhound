import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { createClient } from "@/supabase/server";
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
  // New detailed scoring categories
  categoryScores: z.object({
    searchability: z.number().min(0).max(100),
    hardSkills: z.number().min(0).max(100),
    softSkills: z.number().min(0).max(100),
    recruiterTips: z.number().min(0).max(100),
    formatting: z.number().min(0).max(100),
  }),
  // Detailed feedback for each category
  categoryFeedback: z.object({
    searchability: z.array(
      z.object({
        issue: z.string(),
        status: z.enum(["pass", "fail", "warning"]),
        tip: z.string().optional(),
      }),
    ),
    contactInfo: z.array(
      z.object({
        issue: z.string(),
        status: z.enum(["pass", "fail", "warning"]),
        tip: z.string().optional(),
      }),
    ),
    summary: z.array(
      z.object({
        issue: z.string(),
        status: z.enum(["pass", "fail", "warning"]),
        tip: z.string().optional(),
      }),
    ),
    sectionHeadings: z.array(
      z.object({
        issue: z.string(),
        status: z.enum(["pass", "fail", "warning"]),
        tip: z.string().optional(),
      }),
    ),
    jobTitleMatch: z.array(
      z.object({
        issue: z.string(),
        status: z.enum(["pass", "fail", "warning"]),
        tip: z.string().optional(),
      }),
    ),
    dateFormatting: z.array(
      z.object({
        issue: z.string(),
        status: z.enum(["pass", "fail", "warning"]),
        tip: z.string().optional(),
      }),
    ),
  }),
});

type ATSResponse = z.infer<typeof atsSchema>;

export async function POST(req: NextRequest) {
  try {
    // Check for Google API key
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      console.error(
        "Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable",
      );
      return NextResponse.json(
        { error: "Server configuration error: Missing AI API key" },
        { status: 500 },
      );
    }

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

    // Parse the request body based on content type
    const contentType = req.headers.get("content-type") || "";
    let jobPosting: string | null = null;
    let resumeFile: File | null = null;
    let scanId: string | null = null;
    let jobId: string | null = null;
    let resumeId: string | null = null;
    let resumeFilename: string | null = null;

    try {
      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        jobPosting = formData.get("jobPosting") as string;
        resumeFile = formData.get("resume") as File;
        scanId = formData.get("scanId") as string;
        jobId = formData.get("jobId") as string;
        resumeId = formData.get("resumeId") as string;
        resumeFilename = resumeFile?.name;
      } else {
        // Handle JSON request
        const jsonData = await req.json();
        jobPosting = jsonData.jobPosting;
        scanId = jsonData.scanId;
        jobId = jsonData.jobId;
        resumeId = jsonData.resumeId;
        resumeFilename = jsonData.resumeFilename;

        // If resumeUrl is provided, fetch the PDF
        if (jsonData.resumeUrl) {
          const pdfResponse = await fetch(jsonData.resumeUrl);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
          }
          const pdfBlob = await pdfResponse.blob();
          resumeFile = new File([pdfBlob], resumeFilename || "resume.pdf", {
            type: "application/pdf",
          });
        }
      }

      if (
        !jobPosting ||
        !scanId ||
        !jobId ||
        !resumeId ||
        (!resumeFile && !resumeFilename)
      ) {
        return NextResponse.json(
          {
            error: "Missing required parameters",
            received: {
              jobPosting: !!jobPosting,
              scanId: !!scanId,
              jobId: !!jobId,
              resumeId: !!resumeId,
              resumeFile: !!resumeFile,
              resumeFilename: !!resumeFilename,
            },
          },
          { status: 400 },
        );
      }

      const timestamp = new Date().toISOString();

      // Decrement the user's API call count using the Edge Function
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

      // Only proceed with AI analysis if we have a resume file
      if (!resumeFile) {
        return NextResponse.json(
          {
            error: "Resume file is required for analysis",
          },
          { status: 400 },
        );
      }

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
- Key missing keywords

Additionally, provide detailed category scores and feedback for:

1. Searchability (0-100 score):
   - Check if resume has proper keywords from job description
   - Verify if resume format is ATS-friendly
   - Check if contact information is complete

2. Contact Information (pass/fail checks):
   - Verify presence of email address
   - Verify presence of phone number
   - Check for physical address

3. Summary Section (pass/fail checks):
   - Check if resume has a summary/objective section
   - Evaluate if summary aligns with job requirements

4. Section Headings (pass/fail checks):
   - Verify if experience section has proper heading ("Work History" or "Professional Experience")
   - Check if education section is properly labeled

5. Job Title Match (pass/fail checks):
   - Check if resume contains job titles similar to the one in job description
   - Suggest title modifications if needed

6. Date Formatting (pass/fail checks):
   - Verify if work experience dates are properly formatted
   - Check for any gaps in employment

For each category, provide specific issues with a status of 'pass', 'fail', or 'warning' and optional tips for improvement.`,
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
    } catch (error: any) {
      console.error("Error processing request:", error);

      // Update the scan status to error if we have a scan ID
      if (scanId) {
        await supabase
          .from("job_scans")
          .update({
            status: "error",
            error_message: error?.message || "Unknown error occurred",
          })
          .eq("id", scanId);
      }

      return NextResponse.json(
        {
          error: "An error occurred while processing your request",
          details: error?.message,
        },
        { status: 500 },
      );
    }
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
