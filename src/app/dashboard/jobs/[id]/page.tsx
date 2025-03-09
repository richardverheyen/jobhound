import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../../../supabase/server";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Clock, BarChart3 } from "lucide-react";
import Link from "next/link";
import ScanHistoryList from "@/components/scan-history-list";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { scan?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return redirect("/dashboard/jobs");
  }

  // Get scans for this job
  const { data: scans, error: scansError } = await supabase
    .from("job_scans")
    .select("*")
    .eq("job_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard/jobs">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Jobs
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">{job.title}</h1>
            {job.company && (
              <div className="text-lg text-muted-foreground">
                {job.company}
                {job.location ? ` • ${job.location}` : ""}
              </div>
            )}
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Added on {formatDate(job.created_at)}
            </div>
          </header>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{job.description}</div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Analyses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{scans?.length || 0}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Analysis Button */}
          <div className="flex justify-end">
            <Link href={`/dashboard/jobs/${params.id}/analyze`}>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                New Analysis
              </Button>
            </Link>
          </div>

          {/* Scan History */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis History</CardTitle>
              <CardDescription>Previous analyses for this job</CardDescription>
            </CardHeader>
            <CardContent>
              {scans && scans.length > 0 ? (
                <ScanHistoryList initialScans={scans} userId={user.id} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No analyses found for this job. Click "New Analysis" to
                  analyze this job against a resume.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
