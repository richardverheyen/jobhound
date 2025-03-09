import { createClient } from "../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Get the resume ID from the query parameters
    const url = new URL(req.url);
    const resumeId = url.searchParams.get("resumeId");

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 },
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
      .select("id, user_id")
      .eq("token_identifier", apiKey)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Get resume data
    const { data: resumeData, error: resumeError } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .eq("user_id", userData.user_id)
      .single();

    if (resumeError || !resumeData) {
      return NextResponse.json(
        { error: "Resume not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        fileUrl: resumeData.file_url,
        filename: resumeData.filename,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error getting resume:", error);
    return NextResponse.json(
      {
        error: "An error occurred while getting the resume",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
