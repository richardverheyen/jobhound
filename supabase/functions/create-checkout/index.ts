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

async function createCreditSelectionSession(
  userId: string,
  returnUrl: string,
  customerEmail?: string
) {
  console.log("Fetching prices for credit selection...");
  // Fetch available prices for API credits
  const { data: prices } = await stripe.prices.list({
    active: true,
    expand: ['data.product'],
    limit: 10,
  });
  
  console.log("Found prices:", JSON.stringify(prices));
  
  // Filter prices for API credits product
  const creditPrices = prices.filter((price: any) => {
    if (!price.product) {
      console.log("Price has no product:", price.id);
      return false;
    }
    const product = typeof price.product === 'string' 
      ? { active: true, metadata: {} }
      : price.product;
    console.log("Checking product:", JSON.stringify(product));
    
    // Check for either credit_product=true OR credits metadata OR product name contains "API Credits"
    const isCredit = product.metadata?.credit_product === 'true' ||
                    product.metadata?.credits !== undefined ||
                    product.name?.toLowerCase().includes('api credits');
    
    // Only include prices that match our package amounts ($2 and $5)
    const isValidAmount = price.unit_amount === 200 || price.unit_amount === 500;
    
    return product.active && isCredit && isValidAmount;
  });
  
  console.log("Filtered credit prices:", JSON.stringify(creditPrices));
  
  if (creditPrices.length === 0) {
    throw new Error("No active credit prices found. Please ensure prices are configured with credit_product=true in metadata");
  }
  
  // Create a session with a price selection
  console.log("Creating checkout session...");
  return await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    billing_address_collection: 'auto',
    line_items: creditPrices.map((price: any) => ({
      price: price.id,
      quantity: 1,
    })),
    mode: "payment",
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=true`,
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    metadata: {
      userId,
    },
    allow_promotion_codes: true,
  });
}

async function createDirectCheckoutSession(
  userId: string,
  returnUrl: string,
  priceId: string,
  customerEmail?: string
) {
  console.log("Creating direct checkout session with priceId:", priceId);
  return await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=true`,
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    metadata: {
      userId,
    },
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
    
    const { user_id, return_url, email, priceId, mode } = requestBody;

    if (!user_id || !return_url) {
      throw new Error("Missing required parameters: user_id and return_url are required");
    }

    // Get customer email from headers or body
    const customerEmail = req.headers.get("X-Customer-Email") || email || "";
    let session;

    // Create appropriate checkout session based on mode
    console.log("Creating checkout session with mode:", mode);
    if (mode === 'credit-selection') {
      session = await createCreditSelectionSession(user_id, return_url, customerEmail);
    } else if (priceId) {
      session = await createDirectCheckoutSession(user_id, return_url, priceId, customerEmail);
    } else {
      // Default behavior - show all prices
      console.log("Using default behavior - fetching all prices");
      const { data: prices } = await stripe.prices.list({
        active: true,
        limit: 10,
      });

      console.log("Found prices:", JSON.stringify(prices));

      if (prices.length === 0) {
        throw new Error("No active prices found in Stripe");
      }

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: prices.map((price: any) => ({
          price: price.id,
          quantity: 1,
        })),
        mode: "payment",
        success_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${return_url}?canceled=true`,
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        metadata: {
          userId: user_id,
        },
      });
    }

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