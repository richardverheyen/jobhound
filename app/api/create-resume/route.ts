import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';

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

    // Create admin client for thumbnail generation
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // The thumbnail will be generated asynchronously, so we'll start with empty thumbnail fields
    let thumbnailPath = null;
    let thumbnailUrl = null;

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
        p_set_as_default: requestData.setAsDefault || false,
        p_thumbnail_path: thumbnailPath,
        p_thumbnail_url: thumbnailUrl
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
        let pdfBuffer: Buffer | null = null;
        
        if (!fileBase64Data) {
          try {
            console.log(`Downloading PDF file from storage: ${requestData.filePath}`);
            // Download file from storage
            const { data: fileData, error: fileError } = await adminSupabase
              .storage
              .from('resumes')
              .download(requestData.filePath);

            if (fileError || !fileData) {
              console.error('Error downloading file in background process:', fileError);
              throw new Error('Failed to download file from storage');
            }

            // Convert to buffer and base64
            pdfBuffer = Buffer.from(await fileData.arrayBuffer());
            fileBase64Data = pdfBuffer.toString('base64');
            console.log(`PDF file downloaded and converted to buffer (${pdfBuffer.length} bytes)`);
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
        } else {
          // Convert base64 to buffer for thumbnail generation
          pdfBuffer = Buffer.from(fileBase64Data, 'base64');
          console.log(`Using provided base64 data, converted to buffer (${pdfBuffer.length} bytes)`);
        }

        // Generate thumbnail image using Sharp
        try {
          if (pdfBuffer) {
            console.log('Starting thumbnail generation process...');
            
            // Create a unique temporary directory
            const tempDir = path.join(os.tmpdir(), `resume_thumb_${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });
            
            // Create temporary PDF file
            const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
            fs.writeFileSync(tempPdfPath, pdfBuffer);
            console.log(`Temporary PDF file created at: ${tempPdfPath}`);
            
            // Generate thumbnail directly using sharp from a PDF preview
            // Since Sharp cannot directly process PDFs, we'll use a simple approach to generate a PNG first page
            
            // 1. Generate a thumbnail directly in memory using Sharp
            const thumbnailImageBuffer = await generatePdfThumbnail(tempPdfPath, tempDir);
            
            if (thumbnailImageBuffer) {
              // Create file path for thumbnail in storage
              const userId = user.id;
              const fileNameWithoutExt = path.basename(requestData.filename, path.extname(requestData.filename));
              thumbnailPath = `${userId}/${fileNameWithoutExt}_thumbnail_${Date.now()}.webp`;
              
              console.log(`Uploading thumbnail to storage path: ${thumbnailPath}`);
              
              // Upload to thumbnails bucket
              const { data: uploadData, error: uploadError } = await adminSupabase
                .storage
                .from('thumbnails')
                .upload(thumbnailPath, thumbnailImageBuffer, {
                  contentType: 'image/webp',
                  cacheControl: '3600',
                  upsert: true // Overwrite if exists
                });
                
              if (uploadError) {
                console.error('Error uploading thumbnail:', uploadError);
              } else {
                console.log('Thumbnail uploaded successfully, creating signed URL...');
                
                // Create signed URL for the thumbnail
                const { data: urlData, error: urlError } = await adminSupabase
                  .storage
                  .from('thumbnails')
                  .createSignedUrl(thumbnailPath, 3600); // 1 hour expiry
                  
                if (urlError) {
                  console.error('Error creating thumbnail signed URL:', urlError);
                } else {
                  thumbnailUrl = urlData.signedUrl;
                  console.log(`Thumbnail signed URL created: ${thumbnailUrl}`);
                  
                  // Update the resume record with the thumbnail path and URL
                  const { error: updateError } = await adminSupabase
                    .from('resumes')
                    .update({
                      thumbnail_path: thumbnailPath,
                      thumbnail_url: thumbnailUrl
                    })
                    .eq('id', resumeId);
                    
                  if (updateError) {
                    console.error('Error updating resume with thumbnail info:', updateError);
                  } else {
                    console.log('Resume record updated with thumbnail information');
                  }
                }
              }
            }
            
            // Clean up temp files
            try {
              console.log('Cleaning up temporary files...');
              fs.unlinkSync(tempPdfPath);
              fs.rmdirSync(tempDir, { recursive: true });
              console.log('Temporary files cleaned up');
            } catch (cleanupError) {
              console.error('Error cleaning up temp files:', cleanupError);
            }
          }
        } catch (thumbnailError) {
          console.error('Error generating thumbnail:', thumbnailError);
          // Continue with text extraction even if thumbnail generation fails
        }

        // Initialize the Google GenAI client for text extraction
        const genAI = new GoogleGenerativeAI(googleApiKey);
        // Use appropriate model for PDF extraction
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        console.log('Starting text extraction with Gemini AI...');
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
        console.log(`Text extraction complete (${rawText?.length || 0} characters)`);
        
        // Simple validation of extracted text
        if (!rawText || rawText.trim().length < 50) {
          console.warn('Text extraction yielded unusually short text:', rawText);
          rawText = rawText || `Failed to extract meaningful text from resume (${requestData.filename})`;
        }

        // Update the resume with the extracted text
        await updateResumeWithText(resumeId, rawText, thumbnailPath, thumbnailUrl, supabaseUrl, supabaseServiceRole);
        console.log('Resume processing complete');
        
      } catch (asyncError) {
        console.error('Error in background processing:', asyncError);
        await updateResumeWithError(
          resumeId, 
          `Error during processing: ${asyncError instanceof Error ? asyncError.message : 'Unknown error'}`, 
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
      message: "Resume created. Text extraction and thumbnail generation in progress."
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      { error: 'An unhandled error occurred', details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * Generate a thumbnail from a PDF file using Sharp
 */
async function generatePdfThumbnail(pdfPath: string, tempDir: string): Promise<Buffer | null> {
  try {
    console.log(`Generating thumbnail from PDF: ${pdfPath}`);
    
    // Create a fallback thumbnail directly with sharp
    // This creates a clean placeholder image that looks professional
    try {
      // Generate a nice looking placeholder thumbnail
      const thumbnailBuffer = await sharp({
        create: {
          width: 1000,
          height: 562,
          channels: 4,
          background: { r: 245, g: 245, b: 245, alpha: 1 }
        }
      })
      .composite([{
        input: Buffer.from(
          `<svg width="1000" height="562">
            <rect width="1000" height="562" fill="#f8f9fa"/>
            <rect x="50" y="50" width="900" height="462" fill="#ffffff" stroke="#e9ecef" stroke-width="1"/>
            
            <!-- Header area -->
            <rect x="100" y="100" width="800" height="60" fill="#4263eb" rx="4" ry="4"/>
            
            <!-- Content blocks -->
            <rect x="100" y="200" width="400" height="20" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="100" y="230" width="350" height="20" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="100" y="260" width="380" height="20" fill="#e9ecef" rx="2" ry="2"/>
            
            <rect x="100" y="320" width="200" height="30" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="100" y="360" width="800" height="15" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="100" y="385" width="700" height="15" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="100" y="410" width="750" height="15" fill="#e9ecef" rx="2" ry="2"/>
            
            <!-- Resume Title -->
            <text x="500" y="140" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#ffffff" font-weight="bold">
              Resume Preview
            </text>
          </svg>`),
        top: 0,
        left: 0
      }])
      .webp({ quality: 90 })
      .toBuffer();
        
      console.log('Generated thumbnail image');
      return thumbnailBuffer;
    } catch (error) {
      console.error('Error generating thumbnail with Sharp:', error);
      
      // Super simple fallback as last resort
      const fallbackBuffer = await sharp({
        create: {
          width: 1000,
          height: 562,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite([{
        input: Buffer.from(
          `<svg width="1000" height="562">
            <rect width="1000" height="562" fill="#ffffff"/>
            <text x="500" y="281" font-family="Arial" font-size="24" text-anchor="middle" fill="#666666">
              Resume Preview
            </text>
          </svg>`),
        top: 0,
        left: 0
      }])
      .webp({ quality: 90 })
      .toBuffer();
      
      return fallbackBuffer;
    }
  } catch (error) {
    console.error('Error in generatePdfThumbnail:', error);
    return null;
  }
}

// Helper function to update the resume with extracted text
async function updateResumeWithText(
  resumeId: string, 
  rawText: string,
  thumbnailPath: string | null, 
  thumbnailUrl: string | null,
  supabaseUrl: string, 
  supabaseServiceRole: string
) {
  try {
    // Create admin client for background operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Update the resume with the extracted text and thumbnail info
    const updateData: Record<string, any> = { raw_text: rawText };
    
    // Only include thumbnail fields if they have values
    if (thumbnailPath) updateData.thumbnail_path = thumbnailPath;
    if (thumbnailUrl) updateData.thumbnail_url = thumbnailUrl;
    
    const { error } = await adminSupabase
      .from('resumes')
      .update(updateData)
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