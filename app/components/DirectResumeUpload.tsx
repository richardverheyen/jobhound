'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';

interface DirectResumeUploadProps {
  onSuccess?: (resumeId: string) => void;
  className?: string;
  buttonText?: string;
}

export default function DirectResumeUpload({ 
  onSuccess, 
  className = "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700",
  buttonText = "Upload New Resume"
}: DirectResumeUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Validation checks
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }
    
    // Use filename without extension as the default name
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    
    // Start the upload process
    await uploadResume(file, fileName);
  };

  const uploadResume = async (file: File, name: string) => {
    setLoading(true);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error(`Authentication error: ${userError.message}`);
      }
      
      if (!userData.user) {
        throw new Error('User not authenticated.');
      }
      
      const userId = userData.user.id;
      const formattedFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${userId}/${formattedFileName}`;
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf',
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Error uploading file: ${uploadError.message || uploadError.name || 'Unknown storage error'}`);
      }
      
      if (!uploadData) {
        throw new Error('No data returned from storage upload');
      }
      
      // Get the public URL
      let fileUrl: string | null = null;
      
      try {
        // Try public URL first 
        const { data: publicUrlData } = await supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);
          
        fileUrl = publicUrlData?.publicUrl || null;
      } catch (urlErr) {
        console.warn('Error getting public URL:', urlErr);
        
        // If public URL failed, try signed URL
        try {
          const { data: signedUrlData } = await supabase.storage
            .from('resumes')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
            
          fileUrl = signedUrlData?.signedUrl || null;
        } catch (signedErr) {
          console.warn('Error creating signed URL:', signedErr);
        }
      }
      
      if (!fileUrl) {
        // Construct a path-based URL as last resort
        fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${filePath}`;
      }
      
      // Get authentication token for the API call
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      
      if (!authToken) {
        throw new Error('Failed to get authentication token');
      }
      
      // Read file as base64 for text extraction
      const fileReader = new FileReader();
      const fileBase64Promise = new Promise<string>((resolve, reject) => {
        fileReader.onload = () => {
          const base64 = fileReader.result?.toString().split(',')[1]; // Remove data URL prefix
          if (base64) {
            resolve(base64);
          } else {
            reject(new Error('Failed to convert file to base64'));
          }
        };
        fileReader.onerror = () => reject(fileReader.error);
        fileReader.readAsDataURL(file);
      });
      
      const fileBase64 = await fileBase64Promise;
      
      // Call the API to create resume and extract text
      const apiResponse = await fetch('/api/create-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          filename: file.name,
          name: name,
          filePath: filePath,
          fileSize: file.size,
          fileUrl: fileUrl,
          setAsDefault: true,
          fileBase64: fileBase64
        })
      });
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(`API error: ${errorData.error || apiResponse.statusText}`);
      }
      
      const resumeData = await apiResponse.json();
      
      if (!resumeData.success) {
        throw new Error(`Resume creation failed: ${resumeData.error || 'Unknown error'}`);
      }
      
      // Call onSuccess with the resume ID if provided
      if (onSuccess && resumeData.resume_id) {
        onSuccess(resumeData.resume_id);
      }
      
      // Instead of refreshing the page, just invalidate the cache for the current route
      // This will trigger a re-fetch of data without a full navigation
      router.refresh();
      
    } catch (err: any) {
      console.error('Resume upload failed:', err);
      alert(`Error uploading resume: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Upload resume file"
        data-testid="direct-resume-file-input"
      />
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${className} ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
        data-testid="direct-upload-resume-button"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            {buttonText}
          </>
        )}
      </button>
    </>
  );
} 