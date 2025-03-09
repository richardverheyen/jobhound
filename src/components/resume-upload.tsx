"use client";

import { useState } from "react";
import { supabase } from "../../supabase/supabase";
import { Button } from "./ui/button";
import { Upload } from "lucide-react";
import { FormMessage, type Message } from "./form-message";

interface ResumeUploadProps {
  userId: string;
  onUploadComplete: (resumeId: string, filename: string) => void;
}

export default function ResumeUpload({
  userId,
  onUploadComplete,
}: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Message | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      setError({ error: "Please upload a PDF file" });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError({ error: "File size must be less than 10MB" });
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload file to Supabase Storage
      const filename = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(`${userId}/${filename}`, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage
        .from("resumes")
        .getPublicUrl(`${userId}/${filename}`);

      // Create record in resumes table
      const { data: resumeData, error: dbError } = await supabase
        .from("resumes")
        .insert([
          {
            user_id: userId,
            filename: file.name,
            file_path: uploadData.path,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Call the completion handler
      onUploadComplete(resumeData.id, file.name);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError({ error: err.message || "Failed to upload resume" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
        <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-1">
          Upload your resume (PDF only)
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Maximum file size: 10MB
        </p>
        <Button variant="outline" disabled={isUploading} className="relative">
          {isUploading ? "Uploading..." : "Select File"}
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            onChange={handleFileChange}
            accept=".pdf"
            disabled={isUploading}
          />
        </Button>
      </div>
      {error && <FormMessage message={error} />}
    </div>
  );
}
