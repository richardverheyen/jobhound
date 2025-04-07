import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

// Import type reference to fix TypeScript errors
/// <reference path="../types.d.ts" />

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-customer-email",
};

interface RequestBody {
  user_id: string;
  return_url: string;
  email?: string;
  priceId?: string;
  mode?: 'credit-selection' | 'direct';
}

async function createCheckoutSession(
  userId: string,
  returnUrl: string,
  customerEmail?: string
) {
  // Use a fixed price ID for the 30 API Credits product
  const priceId = "price_30_credits";
  
  console.log("Creating checkout session for API credits...");
  return await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    billing_address_collection: 'auto',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      }
    ],
    mode: "payment",
    success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}&user_id=${encodeURIComponent(userId)}`,
    cancel_url: `${returnUrl}?canceled=true`,
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    metadata: {
      userId,
    },
    payment_intent_data: {
      metadata: {
        userId,
      },
    },
    allow_promotion_codes: true,
  });
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if Stripe API key is configured
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe API key is not configured");
    }
    console.log("Stripe API key found (length):", stripeKey.length);

    // Parse request body
    const requestBody: RequestBody = await req.json();
    console.log("Request body:", JSON.stringify({
      ...requestBody,
      user_id: requestBody.user_id ? "REDACTED" : undefined,
      email: requestBody.email ? "REDACTED" : undefined,
    }));
    
    const { user_id, return_url, email } = requestBody;

    if (!user_id || !return_url) {
      throw new Error("Missing required parameters: user_id and return_url are required");
    }

    // Get customer email from headers or body
    const customerEmail = req.headers.get("X-Customer-Email") || email || "";
    
    // Create checkout session with the single product
    const session = await createCheckoutSession(user_id, return_url, customerEmail);

    console.log("Checkout session created successfully");
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

  } catch (error) {
    console.error("Detailed error:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const status = errorMessage.includes("API key") ? 500 
      : errorMessage.includes("required parameters") ? 400 
      : 500;

    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: status === 500 ? "server_error" : "invalid_request",
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});