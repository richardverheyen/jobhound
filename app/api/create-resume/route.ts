import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';

// Helper function to add delay for storage operations to complete
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Create admin client for thumbnail generation with service role
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Log bucket existence for debugging
    const { data: buckets, error: bucketsError } = await adminSupabase
      .storage
      .listBuckets();
    
    console.log('Available buckets:', buckets?.map(b => b.name));
    if (bucketsError) {
      console.error('Error listing storage buckets:', bucketsError);
    }

    // The thumbnail will be generated asynchronously, so we'll start with empty thumbnail fields
    let thumbnailPath: string | null = null;
    let thumbnailUrl: string | null = null;

    // Create resume immediately with empty raw_text
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        name: requestData.name,
        file_name: requestData.filename,
        file_path: requestData.filePath,
        file_size: requestData.fileSize,
        file_url: requestData.fileUrl,
        raw_text: null, // Will be updated asynchronously
        created_at: new Date().toISOString(),
        thumbnail_path: null,
        thumbnail_url: null
      })
      .select()
      .single();

    if (resumeError) {
      console.error('Error creating resume record:', resumeError);
      return NextResponse.json(
        { error: 'Failed to create resume record', details: resumeError.message },
        { status: 500 }
      );
    }

    // Get the ID of the created resume
    const resumeId = resume.id;

    // If setAsDefault is true, update the user's default_resume_id
    if (requestData.setAsDefault) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ default_resume_id: resumeId })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error setting default resume:', updateError);
        // Non-critical error, don't return an error response
      }
    }

    // Return success response with resume ID
    const response = {
      success: true,
      resumeId: resumeId,
      message: 'Resume created successfully. Text extraction in progress.',
    };

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
            // Verify we have valid service role credentials before proceeding
            console.log('Verifying Supabase service role credentials...');
            if (!supabaseServiceRole || supabaseServiceRole.length < 20) {
              console.error('Invalid Supabase service role key - operations may fail');
            } else {
              console.log('Service role key appears valid');
            }
            
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

        // Generate and upload thumbnail 
        try {
          if (pdfBuffer) {
            console.log('Starting thumbnail generation process...');
            
            // First, test if we can write to the thumbnails bucket with a small test file
            const testBuffer = Buffer.from('test file for permissions check');
            const testPath = `permission_test_${Date.now()}.txt`;
            
            console.log('Testing storage permissions with a small test file...');
            const { data: testData, error: testError } = await adminSupabase
              .storage
              .from('thumbnails')
              .upload(testPath, testBuffer, { upsert: true });
              
            if (testError) {
              console.error('Permission test failed. Cannot write to thumbnails bucket:', testError);
              console.log('Will attempt to create bucket and proceed anyway...');
            } else {
              console.log('Permission test successful. We can write to the thumbnails bucket.');
              
              // Clean up test file
              try {
                await adminSupabase.storage.from('thumbnails').remove([testPath]);
                console.log('Test file removed.');
              } catch (e) {
                console.log('Could not remove test file, but this is not critical.');
              }
            }
            
            // Create a unique temporary directory
            const tempDir = path.join(os.tmpdir(), `resume_thumb_${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });
            
            // Create temporary PDF file
            const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
            fs.writeFileSync(tempPdfPath, pdfBuffer);
            console.log(`Temporary PDF file created at: ${tempPdfPath}`);
            
            // Generate thumbnail
            const thumbnailImageBuffer = await generatePdfThumbnail(tempPdfPath, tempDir);
            
            if (thumbnailImageBuffer) {
              console.log(`Thumbnail generated successfully (${thumbnailImageBuffer.length} bytes)`);
              
              // Verify the thumbnails bucket exists
              const { data: bucketInfo, error: bucketError } = await adminSupabase
                .storage
                .getBucket('thumbnails');
                
              if (bucketError) {
                console.error('Error checking thumbnails bucket:', bucketError);
                
                // Try to create it if it doesn't exist
                const { data: createData, error: createError } = await adminSupabase
                  .storage
                  .createBucket('thumbnails', { 
                    public: false,
                    allowedMimeTypes: ['image/webp'],
                    fileSizeLimit: 5242880 // 5MB
                  });
                  
                if (createError) {
                  console.error('Error creating thumbnails bucket:', createError);
                  throw new Error(`Could not create thumbnails bucket: ${createError.message}`);
                } else {
                  console.log('Thumbnails bucket created successfully:', createData);
                }
              } else {
                console.log('Thumbnails bucket exists:', bucketInfo);
              }
              
              // Create file path for thumbnail - use a simpler path to avoid errors
              const timestamp = Date.now();
              const fileNameWithoutExt = path.basename(requestData.filename, path.extname(requestData.filename));
              thumbnailPath = `thumbnail_${fileNameWithoutExt}_${timestamp}.webp`;
              
              console.log(`Attempting to upload thumbnail to: ${thumbnailPath}`);
              
              // Try upload with simple path first
              const { data: uploadData, error: uploadError } = await adminSupabase
                .storage
                .from('thumbnails')
                .upload(thumbnailPath, thumbnailImageBuffer, {
                  contentType: 'image/webp',
                  cacheControl: '3600',
                  upsert: true // Overwrite if exists
                });
              
              // Wait for storage to process the upload
              await sleep(2000);  // 2 second delay for consistency
              console.log('Waiting for storage consistency after upload...');

              // Handle upload result
              if (uploadError) {
                console.error('Thumbnail upload error:', uploadError);
                console.error('Error message:', uploadError.message);
                console.error('Error details:', JSON.stringify(uploadError, null, 2));
                throw new Error(`Thumbnail upload failed: ${uploadError.message}`);
              } else {
                console.log('Thumbnail uploaded successfully:', uploadData);
                
                // Verify the file exists in storage after upload
                const { data: fileList, error: listError } = await adminSupabase
                  .storage
                  .from('thumbnails')
                  .list('', { limit: 100 });
                  
                if (listError) {
                  console.error('Error listing thumbnails after upload:', listError);
                } else {
                  console.log('Files in thumbnails bucket:', fileList.map(f => f.name));
                  
                  // Check if our file is in the list
                  const fileExists = fileList.some(f => f.name === thumbnailPath);
                  console.log(`Thumbnail file exists in storage: ${fileExists}`);
                  
                  if (!fileExists) {
                    console.error('Thumbnail appears to be missing after upload!');
                    throw new Error('File upload appeared to succeed but file is not in storage');
                  }
                }
                
                // Generate signed URL for the thumbnail
                console.log(`Generating signed URL for: ${thumbnailPath}`);
                // Wait a bit more to ensure the file is properly available
                await sleep(1000);
                console.log('Waiting for file to be fully available...');
                
                const { data: urlData, error: urlError } = await adminSupabase
                  .storage
                  .from('thumbnails')
                  .createSignedUrl(thumbnailPath, 3600 * 24); // 24 hour expiry
                  
                if (urlError) {
                  console.error('Error creating thumbnail signed URL:', urlError);
                  throw new Error(`Could not create signed URL: ${urlError.message}`);
                } else {
                  thumbnailUrl = urlData.signedUrl;
                  console.log(`Thumbnail signed URL created: ${thumbnailUrl}`);
                  
                  // Wait for URL to become fully available
                  await sleep(1000);
                  console.log('Ensuring URL is fully available...');
                  
                  // Update the resume record with the thumbnail path and URL
                  console.log(`Updating resume ${resumeId} with thumbnail information`);

                  // Verify resumeId is valid
                  if (!resumeId) {
                    console.error('Invalid resumeId, cannot update resume with thumbnail info');
                    throw new Error('Missing resumeId for thumbnail update');
                  }

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
                    
                    // Double-check that the update was successful
                    const { data: checkData, error: checkError } = await adminSupabase
                      .from('resumes')
                      .select('thumbnail_path, thumbnail_url')
                      .eq('id', resumeId)
                      .single();
                      
                    if (checkError) {
                      console.error('Error verifying resume update:', checkError);
                    } else {
                      console.log('Verified resume thumbnail data:', checkData);
                    }
                  }
                }
              }
            } else {
              console.error('Failed to generate thumbnail image buffer');
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
          console.error('Error in thumbnail generation/upload process:', thumbnailError);
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
    return NextResponse.json(response, { status: 200 });

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
    
    // Create a resume-like thumbnail directly with sharp
    // This creates a clean placeholder image that looks professional
    try {
      // Generate a nicer looking placeholder thumbnail that looks more resume-like
      const thumbnailBuffer = await sharp({
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
            
            <!-- Profile Section -->
            <rect x="50" y="50" width="900" height="100" fill="#f8f9fa" rx="4" ry="4"/>
            <circle cx="110" cy="100" r="40" fill="#e9ecef"/>
            <rect x="170" y="70" width="300" height="24" fill="#dee2e6" rx="2" ry="2"/>
            <rect x="170" y="104" width="220" height="16" fill="#dee2e6" rx="2" ry="2"/>
            
            <!-- Contact Info -->
            <rect x="650" y="70" width="250" height="16" fill="#dee2e6" rx="2" ry="2"/>
            <rect x="650" y="96" width="180" height="16" fill="#dee2e6" rx="2" ry="2"/>
            
            <!-- Divider -->
            <rect x="50" y="170" width="900" height="2" fill="#e9ecef"/>
            
            <!-- Experience Section -->
            <rect x="50" y="190" width="200" height="24" fill="#4263eb" rx="2" ry="2"/>
            
            <!-- Job 1 -->
            <rect x="50" y="230" width="240" height="20" fill="#dee2e6" rx="2" ry="2"/>
            <rect x="300" y="230" width="120" height="20" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="70" y="260" width="850" height="12" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="70" y="280" width="820" height="12" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="70" y="300" width="840" height="12" fill="#e9ecef" rx="2" ry="2"/>
            
            <!-- Job 2 -->
            <rect x="50" y="330" width="260" height="20" fill="#dee2e6" rx="2" ry="2"/>
            <rect x="320" y="330" width="140" height="20" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="70" y="360" width="840" height="12" fill="#e9ecef" rx="2" ry="2"/>
            <rect x="70" y="380" width="810" height="12" fill="#e9ecef" rx="2" ry="2"/>
            
            <!-- Skills Section -->
            <rect x="50" y="420" width="120" height="24" fill="#4263eb" rx="2" ry="2"/>
            <rect x="50" y="455" width="100" height="20" fill="#e9ecef" rx="10" ry="10"/>
            <rect x="160" y="455" width="120" height="20" fill="#e9ecef" rx="10" ry="10"/>
            <rect x="290" y="455" width="80" height="20" fill="#e9ecef" rx="10" ry="10"/>
            <rect x="380" y="455" width="140" height="20" fill="#e9ecef" rx="10" ry="10"/>
            <rect x="530" y="455" width="110" height="20" fill="#e9ecef" rx="10" ry="10"/>
            
            <rect x="50" y="485" width="90" height="20" fill="#e9ecef" rx="10" ry="10"/>
            <rect x="150" y="485" width="130" height="20" fill="#e9ecef" rx="10" ry="10"/>
            <rect x="290" y="485" width="100" height="20" fill="#e9ecef" rx="10" ry="10"/>
          </svg>`),
        top: 0,
        left: 0
      }])
      .webp({ quality: 90 })
      .toBuffer();
        
      console.log('Generated resume-like thumbnail image');
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
      
      console.log('Generated fallback thumbnail');
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

/**
 * Update a resume record with an error message
 */
async function updateResumeWithError(
  resumeId: string, 
  errorMessage: string,
  supabaseUrl: string,
  supabaseServiceRole: string
): Promise<void> {
  try {
    // Create admin client for updating the resume
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Update resume with error message and reset any thumbnail data
    // that might be in an inconsistent state
    const { error } = await adminSupabase
      .from('resumes')
      .update({
        raw_text: `Error: ${errorMessage}`,
        processing_status: 'error',
        thumbnail_path: null,  // Reset thumbnail data
        thumbnail_url: null
      })
      .eq('id', resumeId);
    
    if (error) {
      console.error('Error updating resume with error message:', error);
    }
  } catch (error) {
    console.error('Error in updateResumeWithError:', error);
  }
} 