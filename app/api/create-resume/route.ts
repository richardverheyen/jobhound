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

    // Store base64 data for async processing
    const fileBase64 = requestData.fileBase64;

    // Create resume immediately with empty raw_text
    // Call the create_resume function to store the resume initially
    const { data: resumeData, error: resumeError } = await supabase.rpc(
      'create_resume',
      {
        p_filename: requestData.filename,
        p_name: requestData.name,
        p_file_path: requestData.filePath,
        p_file_size: requestData.fileSize,
        p_file_url: requestData.fileUrl,
        p_raw_text: 'Extracting text...',
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

    const resumeId = resumeData.resume_id;

    // Process text extraction asynchronously
    // We don't await this promise, allowing the response to return immediately
    (async () => {
      try {
        // If no fileBase64 is provided, we need to download the file from Supabase storage
        let fileBase64Data = fileBase64;
        if (!fileBase64Data) {
          try {
            // Create admin client for background operations
            const adminSupabase = createClient(supabaseUrl, supabaseServiceRole);
            
            // Download file from storage
            const { data: fileData, error: fileError } = await adminSupabase
              .storage
              .from('resumes')
              .download(requestData.filePath);

            if (fileError || !fileData) {
              console.error('Error downloading file in background process:', fileError);
              throw new Error('Failed to download file from storage');
            }

            // Convert to base64
            const arrayBuffer = await fileData.arrayBuffer();
            fileBase64Data = Buffer.from(arrayBuffer).toString('base64');
          } catch (downloadError) {
            console.error('Error in background file download:', downloadError);
            await updateResumeWithError(
              resumeId, 
              'Error downloading file for text extraction', 
              supabaseUrl, 
              supabaseServiceRole
            );
            return;
          }
        }

        // Initialize the Google GenAI client for text extraction
        const genAI = new GoogleGenerativeAI(googleApiKey);
        // Use appropriate model for PDF extraction
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        // Extract text from PDF
        const prompt = "Extract all text content from this PDF file. Include all paragraphs, bullet points, headers, and any visible text. Maintain the original formatting as much as possible. This is a resume document, so pay special attention to skills, work experience, education, and contact information. Return nothing but the text from the file.";
        
        const result = await model.generateContent({
          contents: [
            { 
              role: "user", 
              parts: [
                { text: prompt },
                { inlineData: { 
                    mimeType: "application/pdf",
                    data: fileBase64Data
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

        let rawText = result.response.text();
        
        // Simple validation of extracted text
        if (!rawText || rawText.trim().length < 50) {
          console.warn('Text extraction yielded unusually short text:', rawText);
          rawText = rawText || `Failed to extract meaningful text from resume (${requestData.filename})`;
        }

        // Update the resume with the extracted text
        await updateResumeWithText(resumeId, rawText, supabaseUrl, supabaseServiceRole);
        
      } catch (asyncError) {
        console.error('Error in background text extraction:', asyncError);
        await updateResumeWithError(
          resumeId, 
          `Error extracting text: ${asyncError instanceof Error ? asyncError.message : 'Unknown error'}`, 
          supabaseUrl, 
          supabaseServiceRole
        );
      }
    })();

    // Return the resume data immediately
    return NextResponse.json({
      success: true,
      resume_id: resumeData.resume_id,
      resume: resumeData.resume,
      message: "Resume created. Text extraction in progress."
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      { error: 'An unhandled error occurred', details: error?.message },
      { status: 500 }
    );
  }
}

// Helper function to update the resume with extracted text
async function updateResumeWithText(
  resumeId: string, 
  rawText: string, 
  supabaseUrl: string, 
  supabaseServiceRole: string
) {
  try {
    // Create admin client for background operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Update the resume with the extracted text
    const { error } = await adminSupabase
      .from('resumes')
      .update({ raw_text: rawText })
      .eq('id', resumeId);
    
    if (error) {
      console.error('Error updating resume with extracted text:', error);
    }
  } catch (error) {
    console.error('Error in updateResumeWithText:', error);
  }
}

// Helper function to update the resume with an error message
async function updateResumeWithError(
  resumeId: string, 
  errorMessage: string, 
  supabaseUrl: string, 
  supabaseServiceRole: string
) {
  try {
    // Create admin client for background operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Update the resume with the error message
    const { error } = await adminSupabase
      .from('resumes')
      .update({ raw_text: errorMessage })
      .eq('id', resumeId);
    
    if (error) {
      console.error('Error updating resume with error message:', error);
    }
  } catch (error) {
    console.error('Error in updateResumeWithError:', error);
  }
} 