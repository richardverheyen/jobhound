import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

// Initialize Stripe later to avoid errors if key is missing
let stripe: Stripe;

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("Stripe key exists:", !!stripeKey);

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: "Stripe API key is not configured",
          code: "stripe_key_missing",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Stripe with the key
    stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

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
        },
      );
    }

    const { user_id, return_url, email } = requestBody;

    console.log("Request parameters:", { user_id, return_url });

    if (!user_id || !return_url) {
      console.error("Missing required parameters:", {
        user_id,
        return_url,
      });
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
        },
      );
    }

    // Get customer email from headers, but make it optional
    const customerEmail = req.headers.get("X-Customer-Email") || "";
    console.log("Customer email from headers:", customerEmail);

    // Use email from body if header is empty
    const effectiveEmail = customerEmail || email || "";
    console.log("Effective email to use:", effectiveEmail);

    // Get or create the API Credits product
    console.log("Finding or creating API Credits product");
    let product;

    try {
      const products = await stripe.products.list({
        active: true,
        metadata: { type: "credits" },
      });

      if (products.data.length > 0) {
        product = products.data[0];
        console.log("Found existing API Credits product:", product.id);
      } else {
        // Create a new product
        product = await stripe.products.create({
          name: "API Credits",
          description: "10 API calls for CV-Job matching service",
          active: true,
          metadata: {
            type: "credits",
            credits: "10",
          },
        });
        console.log("Created new API Credits product:", product.id);
      }
    } catch (stripeError) {
      console.error("Stripe product error:", stripeError);
      return new Response(
        JSON.stringify({
          error: "Failed to get or create Stripe product",
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

    // Get or create a price for the product
    console.log("Finding or creating price for product:", product.id);
    let price;

    try {
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      if (prices.data.length > 0) {
        price = prices.data[0];
        console.log("Found existing price:", price.id);
      } else {
        // Create a new price
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: 1000, // $10.00
          currency: "usd",
          metadata: {
            credits: "10",
          },
        });
        console.log("Created new price:", price.id);
      }
    } catch (priceError) {
      console.error("Stripe price error:", priceError);
      return new Response(
        JSON.stringify({
          error: "Failed to get or create Stripe price",
          details:
            priceError instanceof Error
              ? priceError.message
              : String(priceError),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Creating Stripe checkout session");
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${return_url}?canceled=true`,
        ...(effectiveEmail ? { customer_email: effectiveEmail } : {}), // Only include if we have an email
        metadata: {
          userId: user_id,
          user_id: user_id, // Include both formats to be safe
        },
      });

      console.log("Checkout session created:", session.id);
    } catch (sessionError) {
      console.error("Stripe session creation error:", sessionError);
      return new Response(
        JSON.stringify({
          error: "Failed to create checkout session",
          details:
            sessionError instanceof Error
              ? sessionError.message
              : String(sessionError),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
