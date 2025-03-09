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

    const { price_id, user_id, return_url, mode = "payment" } = requestBody;

    console.log("Request parameters:", { price_id, user_id, return_url, mode });

    if (!price_id || !user_id || !return_url) {
      console.error("Missing required parameters:", {
        price_id,
        user_id,
        return_url,
      });
      return new Response(
        JSON.stringify({
          error: "Missing required parameters",
          code: "missing_parameters",
          details: {
            has_price_id: !!price_id,
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

    const customerEmail = req.headers.get("X-Customer-Email");
    if (!customerEmail) {
      console.error("Customer email is required");
      return new Response(
        JSON.stringify({
          error: "Customer email is required",
          code: "email_required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      console.error("Invalid email format:", customerEmail);
      return new Response(
        JSON.stringify({
          error: "Invalid email format",
          code: "email_invalid",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Creating Stripe checkout session");

    // Verify the price exists in Stripe
    try {
      const price = await stripe.prices.retrieve(price_id);
      console.log("Price verified:", price.id);
    } catch (error) {
      console.error("Error retrieving price:", error);
      return new Response(
        JSON.stringify({
          error: "Invalid price ID",
          code: "price_not_found",
          details: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Stripe checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: price_id,
            quantity: 1,
          },
        ],
        mode: mode,
        success_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${return_url}?canceled=true`,
        customer_email: customerEmail,
        metadata: {
          userId: user_id,
        },
      });

      console.log("Checkout session created:", session.id);

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create checkout session",
          code:
            error instanceof Stripe.errors.StripeError
              ? error.code
              : "unknown_error",
          details: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error in create-checkout:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
        code: "unexpected_error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
