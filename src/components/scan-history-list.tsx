"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabase";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Loader2, ChevronDown, ChevronUp, FileText } from "lucide-react";

type ScanResult = {
  id: string;
  created_at: string;
  job_posting: string;
  resume_filename: string;
  status: string;
  results: any;
  match_score: number;
  error_message?: string;
};

export default function ScanHistoryList({
  initialScans,
  userId,
}: {
  initialScans: ScanResult[];
  userId: string;
}) {
  const [scans, setScans] = useState<ScanResult[]>(initialScans);
  const [expandedScan, setExpandedScan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set up realtime subscription to get updates
    const channel = supabase
      .channel("job_scans_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_scans",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setScans((prev) => [payload.new as ScanResult, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setScans((prev) =>
              prev.map((scan) =>
                scan.id === payload.new.id ? (payload.new as ScanResult) : scan,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setScans((prev) =>
              prev.filter((scan) => scan.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadMoreScans = async () => {
    if (scans.length === 0) return;

    setLoading(true);
    try {
      const lastScan = scans[scans.length - 1];
      const { data, error } = await supabase
        .from("job_scans")
        .select("*")
        .eq("user_id", userId)
        .lt("created_at", lastScan.created_at)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data && data.length > 0) {
        setScans((prev) => [...prev, ...data]);
      }
    } catch (error) {
      console.error("Error loading more scans:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (scanId: string) => {
    setExpandedScan(expandedScan === scanId ? null : scanId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (scans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scan history available. Start by analyzing a resume.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scans.map((scan) => (
        <Card key={scan.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{scan.resume_filename}</span>
                  {getStatusBadge(scan.status)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(scan.created_at)}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Job:</span>{" "}
                  {truncateText(scan.job_posting)}
                </div>
                {scan.match_score !== null &&
                  scan.match_score !== undefined && (
                    <div className="mt-2">
                      <span className="font-medium">Match Score:</span>{" "}
                      <span
                        className={`font-bold ${scan.match_score >= 70 ? "text-green-600" : scan.match_score >= 50 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {scan.match_score}%
                      </span>
                    </div>
                  )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(scan.id)}
              >
                {expandedScan === scan.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {expandedScan === scan.id && (
              <div className="mt-4 pt-4 border-t">
                {scan.status === "error" ? (
                  <div className="text-red-600">
                    Error: {scan.error_message || "An unknown error occurred"}
                  </div>
                ) : scan.status === "processing" ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Processing your analysis...</span>
                  </div>
                ) : scan.results ? (
                  <div className="space-y-3">
                    {scan.results.overallMatch && (
                      <div>
                        <h4 className="font-semibold">Overall Match</h4>
                        <p className="text-sm">{scan.results.overallMatch}</p>
                      </div>
                    )}
                    {scan.results.hardSkills && (
                      <div>
                        <h4 className="font-semibold">Hard Skills</h4>
                        <p className="text-sm">{scan.results.hardSkills}</p>
                      </div>
                    )}
                    {scan.results.softSkills && (
                      <div>
                        <h4 className="font-semibold">Soft Skills</h4>
                        <p className="text-sm">{scan.results.softSkills}</p>
                      </div>
                    )}
                    {scan.results.experienceMatch && (
                      <div>
                        <h4 className="font-semibold">Experience Match</h4>
                        <p className="text-sm">
                          {scan.results.experienceMatch}
                        </p>
                      </div>
                    )}
                    {scan.results.qualifications && (
                      <div>
                        <h4 className="font-semibold">Qualifications</h4>
                        <p className="text-sm">{scan.results.qualifications}</p>
                      </div>
                    )}
                    {scan.results.missingKeywords && (
                      <div>
                        <h4 className="font-semibold">Missing Keywords</h4>
                        <p className="text-sm">
                          {scan.results.missingKeywords}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No results available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {scans.length >= 10 && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={loadMoreScans} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
