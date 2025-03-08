import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { createClient } from "../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

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
    const formData = await req.formData();
    const jobPosting = formData.get("jobPosting");
    const resumeFile = formData.get("resume") as File;

    if (!jobPosting || !resumeFile) {
      return NextResponse.json(
        {
          error: "Job posting and resume file are required",
        },
        { status: 400 },
      );
    }

    // Convert the resume file to ArrayBuffer
    const resumeBuffer = await resumeFile.arrayBuffer();
    const resumePDF = new Uint8Array(resumeBuffer);

    // Format the job posting
    const formattedJobPosting = jobPosting.toString();
    const scanId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Create a readable stream from the AI response
    const stream = streamText({
      model: google("gemini-1.5-pro-latest"),
      messages: [
        {
          role: "system",
          content: `You are an ATS analyzer focused on providing concise, actionable feedback. Compare the resume to the job posting and provide scores and brief insights for key areas. Keep all analysis short and mobile-friendly - each section should be 1-2 sentences maximum. Focus on the most important matches and gaps.

Your response should be in JSON format with the following structure:
{
  "overallMatch": "Brief assessment of overall match with a percentage score",
  "hardSkills": "Assessment of technical skills match",
  "softSkills": "Assessment of soft skills match",
  "experienceMatch": "Assessment of experience level match",
  "qualifications": "Assessment of must-have qualifications",
  "missingKeywords": "List of key missing keywords or skills",
  "matchScore": 75 // A number from 0-100 representing the overall match percentage
}

Make sure to provide specific, actionable feedback in each section.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this resume against the following job posting:\n${formattedJobPosting}`,
            },
            {
              type: "file",
              data: resumePDF,
              mimeType: "application/pdf",
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    // Decrement the user's API call count
    const { error: updateError } = await supabase
      .from("users")
      .update({
        credits: (credits - 1).toString(),
        updated_at: timestamp,
      })
      .eq("id", userData.id);

    if (updateError) {
      console.error("Error updating user credits:", updateError);
      // Continue with the analysis even if updating credits fails
    }

    // Store the job posting and create a scan record using service role to bypass RLS
    const { error: scanError } = await supabase.from("job_scans").insert({
      id: scanId,
      user_id: userData.user_id,
      job_posting: formattedJobPosting,
      resume_filename: resumeFile.name,
      created_at: timestamp,
      status: "processing",
    });

    if (scanError) {
      console.error("Error creating scan record:", scanError);
    }

    // Log the API usage after ensuring the scan record exists
    if (!scanError) {
      const { error: logError } = await supabase.from("api_usage").insert({
        user_id: userData.user_id,
        timestamp: timestamp,
        endpoint: "/api/analyze",
        status: "success",
        scan_id: scanId,
      });

      if (logError) {
        console.error("Error logging API usage:", logError);
      }
    }

    // Create a response with the stream
    const response = new Response(stream);

    // Process the stream in the background to capture the full response
    (async () => {
      try {
        // Get the text from the stream
        const text = await new Response(stream).text();

        // Try to parse the response as JSON and store it
        try {
          const jsonResponse = JSON.parse(text);

          // Update the scan record with the results
          await supabase
            .from("job_scans")
            .update({
              results: jsonResponse,
              status: "completed",
              match_score: jsonResponse.matchScore || 0,
            })
            .eq("id", scanId);
        } catch (jsonError) {
          console.error("Error parsing AI response as JSON:", jsonError);

          // Store the raw text if JSON parsing fails
          await supabase
            .from("job_scans")
            .update({
              results: { raw_text: text },
              status: "completed",
            })
            .eq("id", scanId);
        }
      } catch (streamError) {
        console.error("Error processing stream:", streamError);
        await supabase
          .from("job_scans")
          .update({
            status: "error",
            error_message:
              streamError.message || "Unknown error processing stream",
          })
          .eq("id", scanId);
      }
    })();

    // Return the original stream as the response
    return response;
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        error: "An error occurred while processing your request",
      },
      { status: 500 },
    );
  }
}
