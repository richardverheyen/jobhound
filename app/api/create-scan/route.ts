import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Define our ATS analysis response interface
interface ATSResponse {
  overallMatch: string;
  hardSkills: string;
  softSkills: string;
  experienceMatch: string;
  qualifications: string;
  missingKeywords: string;
  matchScore: number;
  categoryScores: {
    searchability: number;
    hardSkills: number;
    softSkills: number;
    recruiterTips: number;
    formatting: number;
  };
  categoryFeedback: {
    searchability: Array<{
      issue: string;
      status: "pass" | "fail" | "warning";
      tip?: string;
    }>;
    contactInfo: Array<{
      issue: string;
      status: "pass" | "fail" | "warning";
      tip?: string;
    }>;
    summary: Array<{
      issue: string;
      status: "pass" | "fail" | "warning";
      tip?: string;
    }>;
    sectionHeadings: Array<{
      issue: string;
      status: "pass" | "fail" | "warning";
      tip?: string;
    }>;
    jobTitleMatch: Array<{
      issue: string;
      status: "pass" | "fail" | "warning";
      tip?: string;
    }>;
    dateFormatting: Array<{
      issue: string;
      status: "pass" | "fail" | "warning";
      tip?: string;
    }>;
  };
}

// Define structure for request
interface ScanRequest {
  jobId: string;
  resumeId: string;
  resumeUrl?: string;
  resumeFilename?: string;
  scanId?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Get API key from environment variable
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: Missing AI API key' },
        { status: 500 }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const adminClient = createClient(supabaseUrl, supabaseServiceRole);

    // Get the JWT from the request headers
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    // Create a client authorized with the user's JWT
    const supabase = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Parse request - handle both FormData and JSON
    let scanRequest: ScanRequest;
    let resumeFile: ArrayBuffer | null = null;
    let scanId: string | null = null;
    
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const jobId = formData.get('jobId') as string;
      const resumeId = formData.get('resumeId') as string;
      scanId = formData.get('scanId') as string;
      const resumeFileData = formData.get('resume') as File;
      const resumeFilename = resumeFileData?.name;

      if (!jobId || !resumeId || !resumeFileData) {
        return NextResponse.json(
          { error: 'Missing required form fields' }, 
          { status: 400 }
        );
      }

      scanRequest = {
        jobId,
        resumeId,
        resumeFilename,
        scanId
      };
      
      resumeFile = await resumeFileData.arrayBuffer();
    } else {
      try {
        scanRequest = await req.json();
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid JSON payload' },
          { status: 400 }
        );
      }

      if (!scanRequest.jobId || !scanRequest.resumeId) {
        return NextResponse.json(
          { error: 'Missing required fields: jobId and resumeId are required' },
          { status: 400 }
        );
      }
      
      scanId = scanRequest.scanId || null;
    }

    // Get job details
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company, description')
      .eq('id', scanRequest.jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !jobData) {
      console.error('Error fetching job:', jobError);
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get resume details
    const { data: resumeData, error: resumeError } = await supabase
      .from('resumes')
      .select('id, filename, file_url, file_path')
      .eq('id', scanRequest.resumeId)
      .eq('user_id', user.id)
      .single();

    if (resumeError || !resumeData) {
      console.error('Error fetching resume:', resumeError);
      return NextResponse.json(
        { error: 'Resume not found or access denied' },
        { status: 404 }
      );
    }

    // If resumeFile is not already provided, fetch it from storage
    if (!resumeFile && resumeData.file_path) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('resumes')
        .download(resumeData.file_path);
      
      if (fileError || !fileData) {
        console.error('Error downloading resume file:', fileError);
        return NextResponse.json(
          { error: 'Failed to download resume file' },
          { status: 500 }
        );
      }
      
      resumeFile = await fileData.arrayBuffer();
    } else if (!resumeFile && scanRequest.resumeUrl) {
      // If we have a URL but not a file, fetch the file from the URL
      try {
        const pdfResponse = await fetch(scanRequest.resumeUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
        }
        resumeFile = await pdfResponse.arrayBuffer();
      } catch (error) {
        console.error('Error fetching resume from URL:', error);
        return NextResponse.json(
          { error: 'Failed to fetch resume file from URL' },
          { status: 500 }
        );
      }
    }

    if (!resumeFile) {
      return NextResponse.json(
        { error: 'Resume file is required for analysis' },
        { status: 400 }
      );
    }

    // Generate timestamp for all operations
    const timestamp = new Date().toISOString();
    
    // Create a scan record first if we don't have a scan ID
    if (!scanId) {
      try {
        // Use the database function to create a scan and handle credit usage
        const { data: createScanData, error: createScanError } = await supabase.rpc(
          'create_job_scan',
          {
            p_user_id: user.id,
            p_job_id: scanRequest.jobId,
            p_resume_id: scanRequest.resumeId,
            p_resume_filename: resumeData.filename,
            p_job_posting: jobData.description
          }
        );
        
        if (createScanError) {
          console.error('Error creating scan:', createScanError);
          return NextResponse.json(
            { 
              error: createScanError.message || 'Failed to create scan',
              details: createScanError
            },
            { status: 400 }
          );
        }
        
        scanId = createScanData;
      } catch (error: any) {
        console.error('Error in create_job_scan RPC:', error);
        return NextResponse.json(
          { error: 'Failed to create scan record' },
          { status: 500 }
        );
      }
    } else {
      // If scanId was provided, make sure it exists and update its status
      const { error: updateError } = await supabase
        .from('job_scans')
        .update({
          status: 'processing'
        })
        .eq('id', scanId)
        .eq('user_id', user.id);
      
      if (updateError) {
        console.error('Error updating scan record:', updateError);
        return NextResponse.json(
          { error: 'Failed to update scan record or scan not found' },
          { status: 400 }
        );
      }
    }

    if (!scanId) {
      return NextResponse.json(
        { error: 'Failed to create or validate scan ID' },
        { status: 500 }
      );
    }

    try {
      // Initialize the Google GenAI client
      const genAI = new GoogleGenerativeAI(googleApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      
      // Convert the resume file to base64 for the Google API
      const base64Data = Buffer.from(resumeFile).toString('base64');
      
      // Create the prompt for the AI
      const systemPrompt = `You are an ATS analyzer focused on providing concise, actionable feedback. Compare the resume to the job posting and provide scores and brief insights for key areas. Keep all analysis short and mobile-friendly - each section should be 1-2 sentences maximum. Focus on the most important matches and gaps.

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

For each category, provide specific issues with a status of 'pass', 'fail', or 'warning' and optional tips for improvement.

You MUST return a JSON object exactly in this format:
{
  "overallMatch": "string",
  "hardSkills": "string",
  "softSkills": "string",
  "experienceMatch": "string",
  "qualifications": "string",
  "missingKeywords": "string",
  "matchScore": number between 0-100,
  "categoryScores": {
    "searchability": number between 0-100,
    "hardSkills": number between 0-100,
    "softSkills": number between 0-100,
    "recruiterTips": number between 0-100,
    "formatting": number between 0-100
  },
  "categoryFeedback": {
    "searchability": [{"issue": "string", "status": "pass|fail|warning", "tip": "string"}],
    "contactInfo": [{"issue": "string", "status": "pass|fail|warning", "tip": "string"}],
    "summary": [{"issue": "string", "status": "pass|fail|warning", "tip": "string"}],
    "sectionHeadings": [{"issue": "string", "status": "pass|fail|warning", "tip": "string"}],
    "jobTitleMatch": [{"issue": "string", "status": "pass|fail|warning", "tip": "string"}],
    "dateFormatting": [{"issue": "string", "status": "pass|fail|warning", "tip": "string"}]
  }
}`;
      
      const userPrompt = `Analyze this resume against the following job posting:\n${jobData.description}`;
      
      // Call the Google AI
      const result = await model.generateContent({
        contents: [
          { 
            role: "user", 
            parts: [
              { 
                text: `${systemPrompt}\n\n${userPrompt}` 
              },
              { 
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      });

      // Parse the response
      const responseText = result.response.text();
      let analysisResult: ATSResponse;
      
      try {
        // Extract JSON from the response if needed
        const jsonMatches = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                          responseText.match(/```([\s\S]*?)```/) ||
                          [null, responseText];
        
        const cleanJson = jsonMatches[1] || responseText;
        analysisResult = JSON.parse(cleanJson);
        
        // Validate the response has all required fields
        if (
          !analysisResult.overallMatch ||
          !analysisResult.hardSkills ||
          !analysisResult.softSkills ||
          !analysisResult.experienceMatch ||
          !analysisResult.qualifications ||
          !analysisResult.missingKeywords ||
          !analysisResult.matchScore ||
          !analysisResult.categoryScores ||
          !analysisResult.categoryFeedback
        ) {
          throw new Error('Invalid AI response format');
        }
      } catch (error) {
        console.error('Error parsing AI response:', error, 'Response:', responseText);
        
        // Update the scan record with error status
        await supabase
          .from('job_scans')
          .update({
            status: 'error',
            error_message: 'Failed to parse AI response'
          })
          .eq('id', scanId);
          
        return NextResponse.json(
          { error: 'Failed to parse AI response', scanId },
          { status: 500 }
        );
      }

      // Update the scan record with the analysis results
      const { error: updateError } = await supabase
        .from('job_scans')
        .update({
          status: 'completed',
          results: analysisResult,
          match_score: analysisResult.matchScore
        })
        .eq('id', scanId);

      if (updateError) {
        console.error('Error updating scan record:', updateError);
        return NextResponse.json(
          { error: 'Failed to update scan record', scanId },
          { status: 500 }
        );
      }

      // Update the credit usage record with the response payload
      const { data: creditUsageData, error: creditUsageError } = await supabase
        .from('credit_usage')
        .select('id')
        .eq('scan_id', scanId)
        .single();

      if (!creditUsageError && creditUsageData) {
        await supabase
          .from('credit_usage')
          .update({
            response_payload: analysisResult,
            http_status: 200,
            updated_at: new Date().toISOString()
          })
          .eq('id', creditUsageData.id);
      }

      // Return success response
      return NextResponse.json({
        success: true,
        scanId,
        jobId: scanRequest.jobId,
        matchScore: analysisResult.matchScore,
        redirectUrl: `/dashboard/jobs/${scanRequest.jobId}` // For client-side redirection
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error processing AI request:', error);
      
      // Update the scan record with error status
      await supabase
        .from('job_scans')
        .update({
          status: 'error',
          error_message: error?.message || 'AI processing error'
        })
        .eq('id', scanId);
        
      return NextResponse.json({ 
        error: 'Error processing AI request', 
        details: error?.message,
        scanId 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      { error: 'An unhandled error occurred', details: error?.message },
      { status: 500 }
    );
  }
} 