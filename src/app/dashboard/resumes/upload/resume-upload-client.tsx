"use client";

import { useState } from "react";
import ResumeUpload from "@/components/resume-upload";
import { useRouter } from "next/navigation";

interface ResumeUploadClientProps {
  userId: string;
}

export default function ResumeUploadClient({
  userId,
}: ResumeUploadClientProps) {
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleUploadComplete = (resumeId: string, filename: string) => {
    setSuccess(true);
    // Redirect to resumes page after a short delay
    setTimeout(() => {
      router.push("/dashboard/resumes");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {success ? (
        <div className="bg-green-50 text-green-800 p-4 rounded-md text-center">
          <h3 className="font-medium text-lg mb-2">
            Resume Uploaded Successfully!
          </h3>
          <p>Redirecting to your resumes...</p>
        </div>
      ) : (
        <ResumeUpload onUploadComplete={handleUploadComplete} userId={userId} />
      )}
    </div>
  );
}
