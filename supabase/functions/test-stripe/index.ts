import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting test-stripe function");

    // Log all environment variables (without values for security)
    const envVars = Object.keys(Deno.env.toObject());
    console.log("Available environment variables:", envVars);

    // Check if Stripe API key is configured
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("Stripe key exists:", !!stripeKey);
    console.log("Stripe key length:", stripeKey ? stripeKey.length : 0);

    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: "Stripe API key is not configured",
          availableEnvVars: envVars,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Try to initialize Stripe
    try {
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2023-10-16",
        httpClient: Stripe.createFetchHttpClient(),
      });

      // Try a simple Stripe API call
      const balance = await stripe.balance.retrieve();

      return new Response(
        JSON.stringify({
          success: true,
          message: "Stripe connection successful",
          balanceAvailable: balance.available.map((b) => ({
            amount: b.amount,
            currency: b.currency,
          })),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (stripeError) {
      return new Response(
        JSON.stringify({
          error: "Failed to connect to Stripe",
          details:
            stripeError instanceof Error
              ? stripeError.message
              : String(stripeError),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
