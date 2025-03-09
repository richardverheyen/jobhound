"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ResumeUpload from "@/components/resume-upload";

interface ResumeUploadSectionProps {
  userId: string;
}

export default function ResumeUploadSection({
  userId,
}: ResumeUploadSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload New Resume</CardTitle>
        <CardDescription>
          Upload a PDF resume to analyze against job postings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResumeUpload
          userId={userId}
          onUploadComplete={() => {
            // Refresh the page to show the new resume
            window.location.reload();
          }}
        />
      </CardContent>
    </Card>
  );
}
