import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the user ID, credits to decrement, and metadata from the request
    const { userId, creditsToDecrement = 1, metadata = {} } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Import dynamically to avoid issues with Deno
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's current credits
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("credits, user_id")
      .eq("user_id", userId)
      .single();

    if (userError || !userData) {
      console.error("User lookup error:", userError);
      return new Response(
        JSON.stringify({ error: "User not found", details: userError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate new credits
    const currentCredits = parseInt(userData.credits || "0");
    const newCredits = Math.max(0, currentCredits - creditsToDecrement);

    // Update user credits in Supabase
    const { error: updateError } = await supabase
      .from("users")
      .update({
        credits: newCredits.toString(),
        updated_at: new Date().toISOString(),
        metadata: {
          last_credit_update: new Date().toISOString(),
          last_credit_source: "api_usage",
          last_api_call: new Date().toISOString(),
          ...metadata,
        },
      })
      .eq("user_id", userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update user credits" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the API usage
    const { error: logError } = await supabase.from("api_usage").insert({
      user_id: userId,
      timestamp: new Date().toISOString(),
      endpoint: "/api/analyze",
      status: "success",
    });

    if (logError) {
      console.error("Error logging API usage:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Credits updated successfully",
        previousCredits: currentCredits,
        newCredits: newCredits,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating credits:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while updating credits",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
