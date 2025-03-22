import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Get credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create a Supabase client with admin privileges
const adminClient = createClient(supabaseUrl, supabaseKey);

describe('Resume Management Integration Tests', () => {
  let userId: string;
  let userEmail: string;
  let testPdfPath: string;
  let resumeId: string;
  let filePath: string;

  beforeAll(async () => {
    // Create a test user ID
    userId = uuidv4();
    userEmail = `resume-test-${Date.now()}@example.com`;
    
    // Create test PDF file
    testPdfPath = await createTestPdf();
    
    // Clean up any existing user data
    await adminClient.from('resumes').delete().eq('user_id', userId);
    await adminClient.from('users').delete().eq('id', userId);
    
    // Create a test user record
    const now = new Date().toISOString();
    await adminClient
      .from('users')
      .insert([{
        id: userId,
        email: userEmail,
        created_at: now,
        updated_at: now
      }]);
  });

  afterAll(async () => {
    // Clean up test data
    await adminClient.from('resumes').delete().eq('user_id', userId);
    await adminClient.from('users').delete().eq('id', userId);
    
    // Delete the test PDF file
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
    
    // Delete file from storage if it exists
    if (filePath) {
      await adminClient.storage.from('resumes').remove([filePath]);
    }
  });

  test('should create a resume record with file uploaded to storage', async () => {
    // Read the test PDF file
    const fileContent = fs.readFileSync(testPdfPath);
    const fileName = `test-resume-${Date.now()}.pdf`;
    filePath = `${userId}/${fileName}`;
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('resumes')
      .upload(filePath, fileContent, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      });
    
    expect(uploadError).toBeNull();
    expect(uploadData).not.toBeNull();
    
    // Get the public URL
    const { data: publicUrlData } = await adminClient.storage
      .from('resumes')
      .getPublicUrl(filePath);
    
    // Instead of using the RPC function, directly insert into the resumes table
    const { data: insertData, error: insertError } = await adminClient
      .from('resumes')
      .insert([{
        user_id: userId,
        filename: 'Test Resume',
        file_path: filePath,
        file_url: publicUrlData?.publicUrl || '',
        file_size: fileContent.length,
        mime_type: 'application/pdf'
      }])
      .select();
    
    expect(insertError).toBeNull();
    expect(insertData).not.toBeNull();
    expect(insertData?.length).toBe(1);
    
    resumeId = insertData![0].id;
    
    // Set as default resume
    const { error: updateError } = await adminClient
      .from('users')
      .update({ default_resume_id: resumeId })
      .eq('id', userId);
    
    expect(updateError).toBeNull();
    
    // Verify resume was added to the database
    const { data: resume, error: fetchError } = await adminClient
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single();
    
    expect(fetchError).toBeNull();
    expect(resume).not.toBeNull();
    expect(resume.user_id).toBe(userId);
    expect(resume.filename).toBe('Test Resume');
    expect(resume.file_path).toBe(filePath);
    expect(resume.file_size).toBe(fileContent.length);
    expect(resume.mime_type).toBe('application/pdf');
    
    // Verify the resume is set as default
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('default_resume_id')
      .eq('id', userId)
      .single();
    
    expect(userError).toBeNull();
    expect(user).not.toBeNull();
    expect(user?.default_resume_id).toBe(resumeId);
  });

  test('should be able to query and download a resume file from storage', async () => {
    // Check that we have a valid resume ID
    expect(resumeId).toBeDefined();
    
    // Query resume details from the database
    const { data: resume, error: fetchError } = await adminClient
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single();
    
    expect(fetchError).toBeNull();
    expect(resume).not.toBeNull();
    expect(resume.file_path).toBe(filePath);
    
    // Try to download the file
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('resumes')
      .download(resume.file_path);
    
    expect(downloadError).toBeNull();
    expect(fileData).not.toBeNull();
    
    // Verify the file was downloaded successfully by checking it's a valid file
    if (!fileData) {
      throw new Error('File data is null');
    }
    
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Check that the downloaded file has content
    expect(buffer.length).toBeGreaterThan(0);
    
    // Check that the first few bytes match PDF signature (%PDF-)
    const pdfSignature = buffer.slice(0, 5).toString();
    expect(pdfSignature).toBe('%PDF-');
  });
});

/**
 * Creates a test PDF file for upload testing
 * @returns Path to the created test PDF file
 */
async function createTestPdf(): Promise<string> {
  const tempDir = path.join(__dirname, '../../.temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const pdfPath = path.join(tempDir, `test-resume-${Date.now()}.pdf`);
  
  // Create a minimal valid PDF file
  const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
  
  fs.writeFileSync(pdfPath, pdfContent);
  
  return pdfPath;
} 