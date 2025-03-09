import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../../supabase/server";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import ClientPage from "./client-page";

export default async function AnalyzePage() {
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

  // Re-fetch user data after sync attempt
  const { data: refreshedUserData } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const credits = refreshedUserData?.credits
    ? parseInt(refreshedUserData.credits)
    : 0;
  const apiKey = refreshedUserData?.token_identifier || "";

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <ClientPage credits={credits} apiKey={apiKey} />
    </SubscriptionCheck>
  );
}
