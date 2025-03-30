import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { fields } from './v1-fields';
import { ResumeAnalysisResponse, calculateMatchScore } from './types';

// Define structure for request
interface ScanRequest {
  jobId: string;
  resumeId: string;
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Parse request - simplified approach for JSON only
    let scanRequest: ScanRequest;
    let scanId: string | null = null;
    
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

    // Fetch job and resume data in parallel
    const [jobResult, resumeResult] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, title, company, description')
        .eq('id', scanRequest.jobId)
        .eq('user_id', user.id)
        .single(),
      
      supabase
        .from('resumes')
        .select('id, filename, file_url, file_path')
        .eq('id', scanRequest.resumeId)
        .eq('user_id', user.id)
        .single()
    ]);

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

    const jobData = jobResult.data;
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
      // Create a new scan record
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
        .update({ status: 'pending' })
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
      const genAI = new GoogleGenerativeAI(googleApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      
      // Convert the resume file to base64 for the Google API
      const arrayBuffer = await resumeFile.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      
      // Get the system prompt from v1-prompt.md
      const systemPrompt = `
# System Instructions for Resume Analysis

You are an expert resume analyzer. Process each field in the \`fieldDefinitions\` array according to its prompt and context.

## Processing Instructions:

1. Iterate through each field in the \`fieldDefinitions\` array.

2. For each field, carefully analyze the resume according to the prompt in the field's \`fieldContext.prompt\`.

3. Generate responses based on the field's \`type\`:

   - For fields with \`type: "one-to-one"\`: 
     Create a SINGLE response object matching the structure in \`fieldResponse\`.
   
   - For fields with \`type: "one-to-many"\`: 
     Create MULTIPLE response objects in an array, with each object following the structure in \`fieldResponse\`.
     Generate as many objects as are justified by the content found in the resume.
     Each object should represent a distinct item (like a specific skill) identified from the prompt.

4. Replace any template variables in the response (e.g., \`$\{skillNameSlug}\`, \`$\{skillName}\`) with appropriate values.

## Key Abbreviation Dictionary:
For token efficiency, use these abbreviated keys in your response:

\`\`\`
Key mapping:
- id: id (unchanged)
- p: parentFieldId
- l: label
- v: value
- syn: synonyms
- em: exactMatchInResume
- sm: synonymMatchInResume
- rm: relatedTermMatchInResume
- c: confidence
- e: explanation
\`\`\`

## Response Format:

Return a JSON array of response objects:
\`\`\`json
[
  {
    // Response for a one-to-one field
    "id": "physicalAddressPresent",
    "v": true,
    "c": 0.95,
    "e": "Rationale for the assessment"
  },
  {
    // First response for a one-to-many field
    "id": "skill-python",
    "p": "hardSkills", // Include the original field ID as a reference
    "l": "Python",
    "syn": ["Python3", "PyTorch"],
    "em": true,
    "sm": false,
    "rm": true,
    "c": 0.9,
    "e": "Python is mentioned 3 times in the resume"
  },
  {
    // Second response for the same one-to-many field
    "id": "skill-java",
    "p": "hardSkills",
    "l": "Java",
    "syn": ["Java SE", "J2EE"],
    "em": true,
    "sm": true,
    "rm": true,
    "c": 0.85,
    "e": "Java appears twice in the resume"
  }
  // Additional objects as needed
]
\`\`\`

## Important:
- Always maintain the original structure of each \`fieldResponse\` with the abbreviated keys
- For one-to-many fields, create as many objects as necessary - don't limit yourself to a fixed number
- Each response object should include the original field ID as a reference in the "p" property
- For one-to-many fields, each generated object should have a unique ID derived from the content (like "skill-python")
- Provide detailed and specific explanations
- Include all required properties from the corresponding \`fieldResponse\` structure
`;
      
      // Create the prompt for the AI
      const userPrompt = `Analyze this resume against the following job posting:\n${jobData.description}\n\nUse these field definitions for your analysis:\n${JSON.stringify(fields, null, 2)}`;
      
      // Call the Google AI
      const result = await model.generateContent({
        contents: [
          { 
            role: "user", 
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` },
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
          maxOutputTokens: 50000,
          responseMimeType: "application/json",
        },
      });

      // Parse the response
      const responseText = result.response.text();
      let analysisResult: ResumeAnalysisResponse;
      let matchScore: number = 0;
      
      try {
        // Extract JSON from the response if needed
        const jsonMatches = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                          responseText.match(/```([\s\S]*?)```/) ||
                          [null, responseText];
        
        const cleanJson = jsonMatches[1] || responseText;
        analysisResult = JSON.parse(cleanJson);
        
        // Calculate match score but don't save it to the database yet
        matchScore = calculateMatchScore(analysisResult);
        
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

      // Update database with scan results and credit usage in parallel
      const [scanUpdateResult, creditUsageData] = await Promise.all([
        // Update the scan record with the analysis results
        supabase
          .from('job_scans')
          .update({
            status: 'completed',
            results: analysisResult,
            match_score: matchScore
          })
          .eq('id', scanId),
          
        // Get credit usage record
        supabase
          .from('credit_usage')
          .select('id')
          .eq('scan_id', scanId)
          .single()
      ]);

      if (scanUpdateResult.error) {
        console.error('Error updating scan record:', scanUpdateResult.error);
        return NextResponse.json(
          { error: 'Failed to update scan record', scanId },
          { status: 500 }
        );
      }

      // Update credit usage if record exists
      if (!creditUsageData.error && creditUsageData.data) {
        await supabase
          .from('credit_usage')
          .update({
            response_payload: analysisResult,
            http_status: 200,
            created_at: new Date().toISOString()
          })
          .eq('id', creditUsageData.data.id);
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