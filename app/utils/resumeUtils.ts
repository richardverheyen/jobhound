import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Gets a usable URL for a resume file with multiple fallback methods
 * @param supabase The Supabase client
 * @param filePath The file path in storage
 * @param existingUrl Optional existing URL to use first
 * @returns The best available URL or null if all methods fail
 */
export async function getResumeUrl(
  supabase: SupabaseClient, 
  filePath: string, 
  existingUrl?: string | null
): Promise<string | null> {
  // 1. Return existing URL if available
  if (existingUrl) {
    return existingUrl;
  }
  
  // 2. Try to get a public URL
  try {
    const { data: publicUrlData } = await supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);
      
    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl;
    }
  } catch (urlErr) {
    console.warn('Error getting public URL:', urlErr);
  }
  
  // 3. If public URL failed, try signed URL
  try {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 60 * 60 * 24); // 24 hour expiry
      
    if (!signedUrlError && signedUrlData?.signedUrl) {
      return signedUrlData.signedUrl;
    }
  } catch (signedErr) {
    console.warn('Error creating signed URL:', signedErr);
  }
  
  // 4. If both methods failed, use a direct path-based URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/resumes/${filePath}`;
  }
  
  return null;
}

/**
 * Uploads a resume file to Supabase storage
 * @param supabase The Supabase client
 * @param file The file to upload
 * @param userId The user ID for the file path
 * @param onProgress Optional progress callback
 * @returns Object with success status, filePath and URL if successful
 */
export async function uploadResume(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ 
  success: boolean; 
  filePath?: string; 
  fileUrl?: string | null;
  error?: string;
}> {
  try {
    // Create file path with timestamp to avoid conflicts
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${userId}/${fileName}`;
    
    // Upload the file with progress tracking
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting
        contentType: 'application/pdf',
        // @ts-ignore - SupabaseJS supports this but types are missing
        onUploadProgress: onProgress ? 
          (progress: { loaded: number; total: number }) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            onProgress(percent);
          } : undefined
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: uploadError.message || 'Error uploading file'
      };
    }
    
    if (!uploadData) {
      return {
        success: false,
        error: 'No data returned from upload'
      };
    }
    
    // Get a URL for the uploaded file
    const fileUrl = await getResumeUrl(supabase, filePath);
    
    return {
      success: true,
      filePath,
      fileUrl
    };
  } catch (err: any) {
    console.error('Unexpected error during upload:', err);
    return {
      success: false,
      error: err.message || 'Unexpected error during upload'
    };
  }
}

/**
 * Creates a resume record in the database
 * @param supabase The Supabase client
 * @param params The resume parameters
 * @returns The resume data or error
 */
export async function createResumeRecord(
  supabase: SupabaseClient,
  params: {
    filename: string;
    name: string;
    filePath: string;
    fileSize: number;
    fileUrl: string | null;
    setAsDefault: boolean;
  }
): Promise<{ 
  success: boolean; 
  resumeId?: string;
  resume?: any;
  error?: string;
}> {
  try {
    const { data: resumeData, error: resumeError } = await supabase.rpc(
      'create_resume',
      {
        p_filename: params.filename,
        p_name: params.name,
        p_file_path: params.filePath,
        p_file_size: params.fileSize,
        p_file_url: params.fileUrl,
        p_set_as_default: params.setAsDefault
      }
    );
    
    if (resumeError) {
      console.error('Resume creation error:', resumeError);
      return {
        success: false,
        error: resumeError.message || 'Error creating resume record'
      };
    }
    
    if (resumeData?.success === false) {
      console.error('Resume function returned error:', resumeData);
      return {
        success: false,
        error: resumeData.error || 'Database function error'
      };
    }
    
    return {
      success: true,
      resumeId: resumeData?.resume_id,
      resume: resumeData?.resume
    };
  } catch (err: any) {
    console.error('Unexpected error creating resume record:', err);
    return {
      success: false,
      error: err.message || 'Unexpected error creating resume record'
    };
  }
}

/**
 * Delete a resume and its file
 * @param supabase The Supabase client
 * @param resumeId The resume ID to delete
 * @param filePath Optional file path to delete directly
 * @returns Success status and any error messages
 */
export async function deleteResume(
  supabase: SupabaseClient,
  resumeId: string,
  filePath?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // If file path is provided, delete the file first
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([filePath]);
      
      if (storageError) {
        console.warn('Error deleting file:', storageError);
        // Continue anyway to delete the record
      }
    }
    
    // Use the delete_resume function to handle database updates
    const { data, error } = await supabase.rpc('delete_resume', {
      p_resume_id: resumeId
    });
    
    if (error) {
      return {
        success: false,
        error: error.message || 'Error deleting resume'
      };
    }
    
    return {
      success: true
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unexpected error deleting resume'
    };
  }
} 