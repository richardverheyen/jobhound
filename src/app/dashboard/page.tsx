import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/server";
import {
  InfoIcon,
  UserCircle,
  FileText,
  BarChart3,
  Key,
  Clock,
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

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Analyze Resume</CardTitle>
                <CardDescription>
                  Compare a resume against a job posting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a resume and job description to get an AI-powered
                    analysis of the match.
                  </p>
                  <Link href="/dashboard/analyze">
                    <Button className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      Start Analysis
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scan History</CardTitle>
                <CardDescription>
                  View your past resume analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Access your previous resume scans and review the analysis
                    results.
                  </p>
                  <Link href="/dashboard/history">
                    <Button className="w-full" variant="outline">
                      <Clock className="mr-2 h-4 w-4" />
                      View History
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Usage</CardTitle>
                <CardDescription>
                  Monitor your API usage and get your API key
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    View your API usage history, remaining credits, and get your
                    API key for integration.
                  </p>
                  <Link href="/dashboard/api-usage">
                    <Button className="w-full" variant="outline">
                      <Key className="mr-2 h-4 w-4" />
                      View API Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <UserCircle size={48} className="text-primary" />
                <div>
                  <h2 className="font-semibold text-xl">
                    {userData?.name || user.email}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
