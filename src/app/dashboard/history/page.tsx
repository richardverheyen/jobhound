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
import { InfoIcon, FileText, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ScanHistoryList from "@/components/scan-history-list";

export default async function ScanHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Sync credits with Stripe via edge function
  try {
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

  // Get scan history
  const { data: scanHistory, error: scanError } = await supabase
    .from("job_scans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const credits = userData?.credits ? parseInt(userData.credits) : 0;

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Scan History</h1>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
              <InfoIcon size="14" />
              <span>View your past resume analysis results</span>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">
                    {scanHistory?.length || 0}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Remaining Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="text-2xl font-bold">{credits}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last Scan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">
                    {scanHistory && scanHistory.length > 0
                      ? new Date(scanHistory[0].created_at).toLocaleString()
                      : "No scans yet"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Scan Button */}
          <div className="flex justify-end">
            <Link href="/dashboard/analyze">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                New Scan
              </Button>
            </Link>
          </div>

          {/* Scan History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>Your recent resume analyses</CardDescription>
            </CardHeader>
            <CardContent>
              <ScanHistoryList
                initialScans={scanHistory || []}
                userId={user.id}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
