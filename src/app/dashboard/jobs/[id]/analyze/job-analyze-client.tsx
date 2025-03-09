"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ResumeSelector from "@/components/resume-selector";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../../supabase/supabase";

interface JobAnalyzeClientProps {
  job: any;
  userId: string;
  credits: number;
  apiKey: string;
}

export default function JobAnalyzeClient({
  job,
  userId,
  credits,
  apiKey,
}: JobAnalyzeClientProps) {
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleResumeSelected = (resumeId: string, filename: string) => {
    setSelectedResumeId(resumeId);
    setSelectedFilename(filename);
  };

  const handleAnalyze = async () => {
    if (!selectedResumeId) {
      setError("Please select a resume to analyze");
      return;
    }

    if (credits <= 0) {
      setError("No credits available. Please purchase more credits.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create scan record
      const scanId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Get resume file URL
      const response = await fetch(
        `/api/get-resume?resumeId=${selectedResumeId}`,
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get resume data");
      }

      const resumeData = await response.json();

      if (!resumeData || !resumeData.fileUrl) {
        throw new Error("Failed to get resume data");
      }

      // Create scan record
      const createScanResponse = await fetch("/api/create-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          scanId,
          jobId: job.id,
          resumeId: selectedResumeId,
          jobPosting: job.description,
          resumeFilename: selectedFilename,
          resumeUrl: resumeData.fileUrl,
          timestamp,
        }),
      });

      if (!createScanResponse.ok) {
        const errorData = await createScanResponse.json();
        throw new Error(errorData.error || "Failed to create scan");
      }

      // Redirect to the job page with the new scan
      router.push(`/dashboard/jobs/${job.id}?scan=${scanId}`);
    } catch (err: any) {
      setError(err.message || "An error occurred while creating the scan");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Resume to Analyze</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResumeSelector userId={userId} onSelect={handleResumeSelected} />

        {error && (
          <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          className="w-full"
          disabled={!selectedResumeId || credits <= 0 || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Analysis...
            </>
          ) : credits > 0 ? (
            "Analyze Resume"
          ) : (
            "Purchase Credits to Analyze"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
