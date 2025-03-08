import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
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

    // Create a readable stream from the AI response
    const stream = streamObject({
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
    });

    // Decrement the user's API call count
    const { error: updateError } = await supabase
      .from("users")
      .update({
        credits: (credits - 1).toString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.id);

    if (updateError) {
      console.error("Error updating user credits:", updateError);
      // Continue with the analysis even if updating credits fails
      // We'll log the error but not fail the request
    }

    // Log the API usage
    const { error: logError } = await supabase.from("api_usage").insert({
      user_id: userData.user_id,
      timestamp: new Date().toISOString(),
      endpoint: "/api/analyze",
      status: "success",
    });

    if (logError) {
      console.error("Error logging API usage:", logError);
      // Continue with the analysis even if logging fails
    }

    // Return the stream as the response
    return new Response(stream);
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
