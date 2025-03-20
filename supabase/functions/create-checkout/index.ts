import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-customer-email",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting create-checkout function");

    // Check if Stripe API key is configured
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      console.error("STRIPE_SECRET_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: "Stripe API key is not configured",
          code: "stripe_key_missing",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          code: "invalid_request",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { user_id, return_url, email } = requestBody;
    console.log("Request parameters:", { user_id, return_url, email });

    if (!user_id || !return_url) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({
          error: "Missing required parameters",
          code: "missing_parameters",
          details: {
            has_user_id: !!user_id,
            has_return_url: !!return_url,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get customer email from headers or body
    const customerEmail = req.headers.get("X-Customer-Email") || email || "";
    console.log("Customer email:", customerEmail);

    // Use a fixed price ID for simplicity
    // You should replace this with your actual Stripe price ID
    const PRICE_ID = "price_1OvXXXXXXXXXXXXXXXXXXXXX";

    try {
      // First, try to list prices to verify Stripe connection
      console.log("Listing prices to verify Stripe connection");
      const prices = await stripe.prices.list({ limit: 1 });
      console.log(`Found ${prices.data.length} prices`);

      // If we have prices, use the first one
      const priceId = prices.data.length > 0 ? prices.data[0].id : PRICE_ID;
      console.log("Using price ID:", priceId);

      // Create checkout session
      console.log("Creating Stripe checkout session");
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${return_url}?canceled=true`,
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        metadata: {
          userId: user_id,
        },
      });

      console.log("Checkout session created:", session.id);
      console.log("Checkout URL:", session.url);

      return new Response(
        JSON.stringify({
          sessionId: session.id,
          url: session.url,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (stripeError) {
      console.error("Stripe API error:", stripeError);
      return new Response(
        JSON.stringify({
          error: "Stripe API error",
          details:
            stripeError instanceof Error
              ? stripeError.message
              : String(stripeError),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
