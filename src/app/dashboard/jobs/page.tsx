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
import JobList from "@/components/job-list";

export default async function JobsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Jobs</h1>
              <Link href="/dashboard/jobs/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Job
                </Button>
              </Link>
            </div>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
              <InfoIcon size="14" />
              <span>
                Manage your job postings and analyze them against your resumes
              </span>
            </div>
          </header>

          {/* Jobs List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Jobs</CardTitle>
              <CardDescription>All your saved job postings</CardDescription>
            </CardHeader>
            <CardContent>
              <JobList userId={user.id} limit={20} showViewAll={false} />
            </CardContent>
          </Card>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
