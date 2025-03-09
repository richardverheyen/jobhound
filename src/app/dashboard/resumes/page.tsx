import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../../supabase/server";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InfoIcon, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ResumeUploadSection from "@/components/resume-upload-section";
import ResumeCard from "@/components/resume-card";

export default async function ResumesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get all resumes
  const { data: resumes, error: resumesError } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get scan counts for each resume
  const { data: scanCounts, error: scanCountsError } = await supabase
    .from("job_scans")
    .select("resume_id")
    .eq("user_id", user.id)
    .is("resume_id", "not.null");

  // Create a map of resume IDs to scan counts
  const scanCountMap = new Map();
  scanCounts?.forEach((item) => {
    const count = scanCountMap.get(item.resume_id) || 0;
    scanCountMap.set(item.resume_id, count + 1);
  });

  // Add scan counts to resumes
  const resumesWithCounts =
    resumes?.map((resume) => ({
      ...resume,
      scan_count: scanCountMap.get(resume.id) || 0,
    })) || [];

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
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Resumes</h1>
              <Link href="/dashboard/resumes/upload">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Resume
                </Button>
              </Link>
            </div>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
              <InfoIcon size="14" />
              <span>Manage your resumes and use them for job analyses</span>
            </div>
          </header>

          {/* Upload Resume Section */}
          <ResumeUploadSection userId={user.id} />

          {/* Resumes Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Your Resumes</CardTitle>
              <CardDescription>All your uploaded resumes</CardDescription>
            </CardHeader>
            <CardContent>
              {resumesWithCounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No resumes found. Upload your first resume to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resumesWithCounts.map((resume) => (
                    <ResumeCard key={resume.id} resume={resume} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
