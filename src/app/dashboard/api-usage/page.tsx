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
import { InfoIcon, FileText, Clock, BarChart3 } from "lucide-react";
import BuyCreditsButton from "@/components/buy-credits-button";

export default async function ApiUsagePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
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
    .limit(10);

  const credits = userData?.credits ? parseInt(userData.credits) : 0;

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">API Usage</h1>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
              <InfoIcon size="14" />
              <span>Monitor your API usage and remaining credits</span>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Remaining Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-bold">{credits}</div>
                  </div>
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
                  Last Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">
                    {apiUsage && apiUsage.length > 0
                      ? new Date(apiUsage[0].timestamp).toLocaleString()
                      : "No analyses yet"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Key Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your API Key</CardTitle>
              <CardDescription>
                Use this key to authenticate your API requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                {userData?.token_identifier || "No API key available"}
              </div>
            </CardContent>
          </Card>

          {/* Usage History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Usage History</CardTitle>
              <CardDescription>Your recent API calls</CardDescription>
            </CardHeader>
            <CardContent>
              {apiUsage && apiUsage.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Endpoint</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiUsage.map((usage) => (
                        <tr key={usage.id} className="border-b">
                          <td className="py-3 px-4">
                            {new Date(usage.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">{usage.endpoint}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${usage.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                            >
                              {usage.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No API usage history available
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                How to use the CV-Job matching API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Endpoint</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    POST /api/analyze
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Headers</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    x-api-key: YOUR_API_KEY
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    Request Body (FormData)
                  </h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    <p>jobPosting: string - The job posting text</p>
                    <p>resume: file - The resume PDF file</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    Example Request (JavaScript)
                  </h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                    {`const formData = new FormData();
formData.append('jobPosting', 'Job posting text here...');
formData.append('resume', resumeFile); // File object

const response = await fetch('https://your-domain.com/api/analyze', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY'
  },
  body: formData
});

// The response is a stream
const reader = response.body.getReader();
// Process the stream...`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
