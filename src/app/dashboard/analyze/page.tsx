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

  const credits = userData?.credits ? parseInt(userData.credits) : 0;
  const apiKey = userData?.token_identifier || "";

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <ClientPage credits={credits} apiKey={apiKey} />
    </SubscriptionCheck>
  );
}
