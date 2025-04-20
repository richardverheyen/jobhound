import { NextRequest, NextResponse } from 'next/server';
import { fields } from './v1-fields';
import { ResumeAnalysisResponse, calculateMatchScore } from './types';
import { 
  fileToBase64, 
  initGoogleAI, 
  initSupabase, 
  combineResults,
  extractTextFromPdf
} from './utils';
import {
  analyzeSearchability,
  analyzeBestPractices,
  analyzeHardSkills,
  analyzeSoftSkills
} from './services';

// Define structure for request
interface ScanRequest {
  jobId: string;
  resumeId: string;
  scanId?: string;
}

// Define job data interface
interface JobData {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: any;
  raw_job_text: string;
  hard_skills: string[] | null;
  soft_skills: string[] | null;
}

export async function POST(req: NextRequest) {
  // Initialize environment variables once
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // Early validation of essential environment variables
  if (!googleApiKey) {
    console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
    return NextResponse.json(
      { error: 'Server configuration error: Missing AI API key' },
      { status: 500 }
    );
  }

  try {
    // Authentication setup
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    // Create user-based client with auth header
    const supabase = initSupabase(supabaseUrl, supabaseAnonKey, authHeader);
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    console.log("supabase initialised")
    // Parse request - simplified approach for JSON only
    let scanRequest: ScanRequest;
    let scanId: string | null = null;
    
    try {
      scanRequest = await req.json();
      // Use the provided scanId if it exists
      scanId = scanRequest.scanId || null;
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

    // Check for available credits if a new scan is being created
    if (!scanId) {
      const { data: creditsAvailable, error: creditsError } = await supabase.rpc(
        'get_available_credits',
        { p_user_id: user.id }
      );
      
      if (creditsError) {
        console.error('Error checking available credits:', creditsError);
        return NextResponse.json(
          { error: 'Failed to check available credits' },
          { status: 500 }
        );
      }
      
      if (!creditsAvailable || creditsAvailable <= 0) {
        return NextResponse.json(
          { error: 'Insufficient credits. Please purchase more credits to continue.' },
          { status: 402 }
        );
      }
    }

    // Fetch job and resume data in parallel
    const [jobResult, resumeResult] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, title, company, description, requirements, raw_job_text, hard_skills, soft_skills')
        .eq('id', scanRequest.jobId)
        .eq('user_id', user.id)
        .single(),
      
      supabase
        .from('resumes')
        .select('id, filename, file_url, file_path, raw_text')
        .eq('id', scanRequest.resumeId)
        .eq('user_id', user.id)
        .single()
    ]);

    console.log("jobResult", jobResult)
    console.log("resumeResult", resumeResult)

    // Handle job data errors
    if (jobResult.error || !jobResult.data) {
      console.error('Error fetching job:', jobResult.error);
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Handle resume data errors
    if (resumeResult.error || !resumeResult.data) {
      console.error('Error fetching resume:', resumeResult.error);
      return NextResponse.json(
        { error: 'Resume not found or access denied' },
        { status: 404 }
      );
    }

    const jobData: JobData = jobResult.data;
    const resumeData = resumeResult.data;

    // Download resume file from storage
    if (!resumeData.file_path) {
      return NextResponse.json(
        { error: 'Resume file not found in storage' },
        { status: 400 }
      );
    }

    const { data: resumeFile, error: resumeFileError } = await supabase
      .storage
      .from('resumes')
      .download(resumeData.file_path);

    if (resumeFileError || !resumeFile) {
      console.error('Error downloading resume file:', resumeFileError);
      return NextResponse.json(
        { error: 'Failed to download resume file' },
        { status: 500 }
      );
    }

    // Create or update scan record
    if (!scanId) {
      // Create a new scan record using the RPC function that handles credit usage
      try {
        const { data: createScanData, error: createScanError } = await supabase.rpc(
          'create_job_scan',
          {
            p_user_id: user.id,
            p_job_id: scanRequest.jobId,
            p_resume_id: scanRequest.resumeId,
            p_resume_filename: resumeData.filename
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
      // Update existing scan
      const { error: updateError } = await supabase
        .from('job_scans')
        .update({ status: 'processing' })
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

    // Process with AI
    try {
      // Update scan status to 'processing'
      await supabase
        .from('job_scans')
        .update({ status: 'processing' })
        .eq('id', scanId);
        
      // Initialize the Google GenAI client
      const model = initGoogleAI(googleApiKey);
      
      // Convert the resume file to base64 for the Google API
      const resumeBase64 = await fileToBase64(resumeFile);
      
      // Get resume text - either from database or extract it if needed
      let resumeText = resumeData.raw_text;
      if (!resumeText) {
        // Extract text from PDF
        resumeText = await extractTextFromPdf(resumeFile);
        
        // Update resume record with extracted text for future use
        await supabase
          .from('resumes')
          .update({ raw_text: resumeText })
          .eq('id', resumeData.id)
          .eq('user_id', user.id);
      }
      
      // Process each category in parallel
      const [
        searchabilityResults,
        bestPracticesResults,
        hardSkillsResults,
        softSkillsResults
      ] = await Promise.all([
        analyzeSearchability(model, fields, resumeData, jobData),
        analyzeBestPractices(model, fields, resumeBase64, jobData),
        analyzeHardSkills(model, fields, resumeText, jobData),
        analyzeSoftSkills(model, fields, resumeText, jobData)
      ]);

      // Combine results from all categories
      const analysisResult = combineResults(
        searchabilityResults,
        bestPracticesResults,
        hardSkillsResults,
        softSkillsResults
      );
      
      // Calculate match score
      const matchScore = calculateMatchScore(analysisResult);
      
      // Update the scan record with the analysis results
      const { error: scanUpdateError } = await supabase
        .from('job_scans')
        .update({
          status: 'completed',
          results: analysisResult,
          match_score: matchScore
        })
        .eq('id', scanId);
        
      if (scanUpdateError) {
        console.error('Error updating scan record:', scanUpdateError);
        return NextResponse.json(
          { error: 'Failed to update scan record', scanId },
          { status: 500 }
        );
      }

      // Update the credit_usage record with HTTP status
      const { error: creditUpdateError } = await supabase
        .from('credit_usage')
        .update({
          http_status: 200
        })
        .eq('scan_id', scanId);
        
      if (creditUpdateError) {
        console.error('Warning: Failed to update credit usage record:', creditUpdateError);
        // Continue anyway as this is not critical
      }

      // Return success response
      return NextResponse.json({
        success: true,
        scanId,
        jobId: scanRequest.jobId,
        matchScore: matchScore,
        redirectUrl: `/dashboard/jobs/${scanRequest.jobId}`, // For client-side redirection
        status: 'completed'
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
        
      // Update the credit_usage record with error status
      await supabase
        .from('credit_usage')
        .update({
          http_status: 500
        })
        .eq('scan_id', scanId);
        
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