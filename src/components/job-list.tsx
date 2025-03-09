"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabase";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Briefcase, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Link from "next/link";

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  created_at: string;
  has_scan?: boolean;
};

interface JobListProps {
  userId: string;
  limit?: number;
  showViewAll?: boolean;
}

export default function JobList({
  userId,
  limit = 5,
  showViewAll = true,
}: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        // First get all jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (jobsError) throw jobsError;

        // Then get all scans for this user to check which jobs have scans
        const { data: scansData, error: scansError } = await supabase
          .from("job_scans")
          .select("job_id")
          .eq("user_id", userId)
          .not("job_id", "is", null);

        if (scansError) throw scansError;

        // Create a set of job IDs that have scans
        const jobsWithScans = new Set(
          scansData?.map((scan) => scan.job_id) || [],
        );

        // Add the has_scan property to each job
        const jobsWithScanInfo =
          jobsData?.map((job) => ({
            ...job,
            has_scan: jobsWithScans.has(job.id),
          })) || [];

        setJobs(jobsWithScanInfo);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();

    // Set up realtime subscription
    const channel = supabase
      .channel("jobs_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jobs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setJobs((prev) => [payload.new as Job, ...prev.slice(0, limit - 1)]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, limit]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading jobs...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No jobs found. Create your first job to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <Link href={`/dashboard/jobs/${job.id}`} key={job.id}>
          <Card className="cursor-pointer hover:border-primary transition-all">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-medium">{job.title}</div>
                  {job.company && (
                    <div className="text-sm text-muted-foreground">
                      {job.company}
                      {job.location ? ` • ${job.location}` : ""}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(job.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {job.has_scan && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}

      {showViewAll && jobs.length >= limit && (
        <div className="text-center pt-2">
          <Link href="/dashboard/jobs">
            <Button variant="ghost" size="sm">
              View All Jobs
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
