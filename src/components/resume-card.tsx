"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "../../supabase/supabase";

interface ResumeCardProps {
  resume?: {
    id: string;
    filename: string;
    created_at: string;
    scan_count: number;
    file_url?: string;
  };
  userId?: string;
}

export default function ResumeCard({ resume, userId }: ResumeCardProps) {
  const [latestResume, setLatestResume] = useState<any>(null);
  const [scanCount, setScanCount] = useState(0);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    // Only fetch data if userId is provided and resume is not provided
    if (userId && !resume) {
      const fetchLatestResume = async () => {
        setLoading(true);
        try {
          // Get the latest resume
          const { data: resumeData, error: resumeError } = await supabase
            .from("resumes")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (resumeError && resumeError.code !== "PGRST116") {
            throw resumeError;
          }

          if (resumeData) {
            setLatestResume(resumeData);

            // Get count of scans for this resume
            const { count, error: countError } = await supabase
              .from("job_scans")
              .select("id", { count: "exact" })
              .eq("resume_id", resumeData.id)
              .not("resume_id", "is", null);

            if (countError) throw countError;
            setScanCount(count || 0);
          }
        } catch (error) {
          console.error("Error fetching latest resume:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchLatestResume();
    }
  }, [userId, resume]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewPdf = () => {
    const fileUrl = resume?.file_url || latestResume?.file_url;
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center py-4 text-muted-foreground">
            Loading resume...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no resume is found
  if (!resume && !latestResume) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center py-4 text-muted-foreground">
            No resumes found. Upload your first resume to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use the provided resume or the fetched latest resume
  const displayResume = resume || latestResume;
  const displayScanCount = resume?.scan_count || scanCount;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-32 w-32 bg-blue-50 rounded-full flex items-center justify-center mb-2">
            <span className="text-4xl text-blue-500 font-bold">PDF</span>
          </div>
          <h3 className="font-medium text-lg truncate w-full">
            {displayResume.filename}
          </h3>
          <div className="text-sm text-muted-foreground">
            Uploaded on {formatDate(displayResume.created_at)}
          </div>
          <div className="text-sm">
            {displayScanCount} {displayScanCount === 1 ? "scan" : "scans"}
          </div>
          {displayResume.file_url && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleViewPdf}
            >
              View PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
