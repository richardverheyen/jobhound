import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/server";
import {
  InfoIcon,
  UserCircle,
  FileText,
  BarChart3,
  Key,
  Clock,
  Plus,
} from "lucide-react";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import BuyCreditsButton from "@/components/buy-credits-button";
import CreditHistory from "@/components/credit-history";
import JobList from "@/components/job-list";
import ResumeCard from "@/components/resume-card";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
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

  // Get API usage history
  const { data: apiUsage, error: apiError } = await supabase
    .from("api_usage")
    .select("*")
    .eq("user_id", user.id)
    .order("timestamp", { ascending: false })
    .limit(5);

  const credits = userData?.credits ? parseInt(userData.credits) : 0;

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
              <InfoIcon size="14" />
              <span>Welcome to your CV-Job Matching dashboard</span>
            </div>
          </header>

          {/* Create New Scan Section */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    Create New Analysis
                  </h2>
                  <p className="text-muted-foreground">
                    Compare a resume against a job posting to get an AI-powered
                    match analysis
                  </p>
                </div>
                <Link href="/dashboard/jobs/new">
                  <Button className="whitespace-nowrap">
                    <Plus className="mr-2 h-4 w-4" />
                    New Analysis
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Available Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{credits}</div>
                  <BuyCreditsButton
                    userId={user.id}
                    userEmail={user.email || ""}
                    variant="outline"
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Analyses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">
                    {apiUsage?.length || 0}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  API Key
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-mono truncate max-w-[150px]">
                    {userData?.token_identifier
                      ? `${userData.token_identifier.substring(0, 8)}...`
                      : "No API key"}
                  </div>
                  <Link href="/dashboard/api-usage">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Jobs and Resume Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Jobs List */}
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Recent Jobs</CardTitle>
                    <Link href="/dashboard/jobs">
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <JobList userId={user.id} limit={5} />
                </CardContent>
              </Card>
            </div>

            {/* Latest Resume */}
            <div>
              <ResumeCard userId={user.id} />
            </div>
          </div>

          {/* Credit History Section */}
          {/* Only show if credits > 0 to avoid errors if table doesn't exist yet */}
          {credits > 0 && (
            <div className="mt-8">
              <CreditHistory userId={user.id} />
            </div>
          )}
        </div>
      </main>
    </SubscriptionCheck>
  );
}
