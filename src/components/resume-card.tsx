"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabase";
import { Card, CardContent } from "./ui/card";
import { FileText, Clock, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

interface ResumeCardProps {
  userId: string;
}

export default function ResumeCard({ userId }: ResumeCardProps) {
  const [latestResume, setLatestResume] = useState<any>(null);
  const [scanCount, setScanCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4 text-muted-foreground">
            Loading resume...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestResume) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4 text-muted-foreground">
            No resumes found. Upload your first resume to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center gap-3">
          <h3 className="font-semibold text-lg">Latest Resume</h3>
          <FileText className="h-16 w-16 text-blue-600" />
          <div className="font-medium text-lg">{latestResume.filename}</div>
          <div className="text-sm text-muted-foreground flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Uploaded on {formatDate(latestResume.created_at)}
          </div>
          <div className="text-sm">
            {scanCount} {scanCount === 1 ? "scan" : "scans"} with this resume
          </div>
          {latestResume.file_url && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 flex items-center gap-1"
              onClick={() => window.open(latestResume.file_url, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              View PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
