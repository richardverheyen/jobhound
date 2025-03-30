import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Define structure for request
interface CreateResumeRequest {
  filename: string;
  name: string;
  filePath: string;
  fileSize: number;
  fileUrl: string;
  setAsDefault?: boolean;
  fileBase64?: string; // Base64 encoded file content for text extraction
}

export async function POST(req: NextRequest) {
  // Initialize environment variables
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
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

    // Parse request
    let requestData: CreateResumeRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!requestData.filename || !requestData.filePath || !requestData.name) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, filePath, and name are required' },
        { status: 400 }
      );
    }

    // If no fileBase64 is provided, we need to download the file from Supabase storage
    let fileBase64: string | undefined = requestData.fileBase64;
    if (!fileBase64) {
      // Download file from storage
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('resumes')
        .download(requestData.filePath);

      if (fileError || !fileData) {
        console.error('Error downloading file:', fileError);
        return NextResponse.json(
          { error: 'Failed to download file from storage' },
          { status: 500 }
        );
      }

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer();
      fileBase64 = Buffer.from(arrayBuffer).toString('base64');
    }

    // Initialize the Google GenAI client for text extraction
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro-vision" });

    // Extract text from PDF
    let rawText = '';
    try {
      const prompt = "Extract all text content from this PDF file. Include all paragraphs, bullet points, headers, and any visible text. Maintain the original formatting as much as possible.";
      
      const result = await model.generateContent({
        contents: [
          { 
            role: "user", 
            parts: [
              { text: prompt },
              { inlineData: { 
                  mimeType: "application/pdf",
                  data: fileBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      });

      rawText = result.response.text();
    } catch (aiError: any) {
      console.error('Error extracting text from PDF:', aiError);
      // We'll continue even if text extraction fails, just store an empty string
      rawText = 'Error extracting text: ' + (aiError.message || 'Unknown error');
    }

    // Call the create_resume function to store the resume with raw text
    const { data: resumeData, error: resumeError } = await supabase.rpc(
      'create_resume',
      {
        p_filename: requestData.filename,
        p_name: requestData.name,
        p_file_path: requestData.filePath,
        p_file_size: requestData.fileSize,
        p_file_url: requestData.fileUrl,
        p_raw_text: rawText,
        p_set_as_default: requestData.setAsDefault || false
      }
    );

    if (resumeError) {
      console.error('Resume creation error:', resumeError);
      return NextResponse.json(
        { error: `Error creating resume: ${resumeError.message || resumeError.details || 'Unknown database error'}` },
        { status: 500 }
      );
    }

    if (!resumeData || resumeData.success === false) {
      console.error('Resume function returned error:', resumeData);
      return NextResponse.json(
        { error: `Database error: ${resumeData?.error || 'Unknown function error'}` },
        { status: 500 }
      );
    }

    // Return the resume data
    return NextResponse.json({
      success: true,
      resume_id: resumeData.resume_id,
      resume: resumeData.resume
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      { error: 'An unhandled error occurred', details: error?.message },
      { status: 500 }
    );
  }
} 