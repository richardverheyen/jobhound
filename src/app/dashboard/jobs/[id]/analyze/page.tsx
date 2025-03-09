import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../../../../supabase/server";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InfoIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import JobAnalyzeClient from "./job-analyze-client";

export default async function JobAnalyzePage({
  params,
}: {
  params: { id: string };
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

  // Sync credits with Stripe via edge function
  try {
    // First try to apply migrations to ensure tables exist
    await supabase.functions.invoke("apply-migrations");

    // Then sync credits
    const syncResponse = await supabase.functions.invoke("sync-credits", {
      body: { userId: user.id },
    });

    if (syncResponse.error) {
      console.error("Error syncing credits:", syncResponse.error);
    }
  } catch (error) {
    console.error("Failed to sync credits:", error);
  }

  // Get user data including credits
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const credits = userData?.credits ? parseInt(userData.credits) : 0;
  const apiKey = userData?.token_identifier || "";

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/jobs/${params.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Job
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">Analyze Job</h1>
            <div className="text-lg text-muted-foreground">{job.title}</div>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
              <InfoIcon size="14" />
              <span>Select a resume to analyze against this job posting</span>
            </div>
          </header>

          {/* Credits Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Available Credits</h3>
                  <p className="text-sm text-muted-foreground">
                    You have {credits} analysis credits remaining
                  </p>
                </div>
                <div className="text-3xl font-bold">{credits}</div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Form */}
          <JobAnalyzeClient
            job={job}
            userId={user.id}
            credits={credits}
            apiKey={apiKey}
          />
        </div>
      </main>
    </SubscriptionCheck>
  );
}
