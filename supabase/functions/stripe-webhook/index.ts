import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.2";

// Initialize Stripe with the secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Set default credit validity period (1 year in days)
const DEFAULT_VALIDITY_DAYS = 365;

/**
 * Handle a completed checkout session by adding credits to the user's account
 */
async function handleCompletedCheckout(session: any) {
  console.log("Processing completed checkout:", session.id);

  // Get the user ID from the session metadata
  const userId = session.metadata?.userId;
  if (!userId) {
    throw new Error("User ID not found in session metadata");
  }

  // Get line items to determine the purchased credits
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  if (!lineItems.data.length) {
    throw new Error("No line items found in checkout session");
  }

  // Get price details for each line item
  let totalCredits = 0;
  for (const item of lineItems.data) {
    if (!item.price) continue;

    // Get the price object to access the metadata with credit amount
    const price = await stripe.prices.retrieve(item.price.id);
    
    // Get the credit amount from price metadata
    const creditsPerUnit = parseInt(price.metadata?.credits_per_unit || "0", 10);
    
    if (creditsPerUnit > 0) {
      totalCredits += creditsPerUnit * (item.quantity || 1);
    }
  }

  // If no credits were determined, log an error
  if (totalCredits <= 0) {
    throw new Error("Failed to determine credit amount from purchased items");
  }

  // Get product metadata to determine validity period
  let validityDays = DEFAULT_VALIDITY_DAYS;
  if (lineItems.data[0]?.price?.product) {
    const productId = typeof lineItems.data[0].price.product === 'string'
      ? lineItems.data[0].price.product
      : lineItems.data[0].price.product.id;
    
    const product = await stripe.products.retrieve(productId);
    validityDays = parseInt(product.metadata?.validity_days || DEFAULT_VALIDITY_DAYS.toString(), 10);
  }

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  // Create a new credit purchase record
  const { data, error } = await supabase
    .from("credit_purchases")
    .insert({
      user_id: userId,
      credit_amount: totalCredits,
      remaining_credits: totalCredits,
      stripe_session_id: session.id,
      purchase_date: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error("Error creating credit purchase:", error);
    throw new Error(`Failed to create credit purchase: ${error.message}`);
  }

  console.log(`Added ${totalCredits} credits to user ${userId}`);
  return { success: true, credits: totalCredits };
}

// Main request handler
serve(async (req) => {
  try {
    // Parse the webhook payload and verify its signature
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const body = await req.text();

    // Ensure that we have all necessary env variables
    if (!webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          error: "Configuration error - missing environment variables",
        }),
        { status: 500 }
      );
    }

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err}`);
      return new Response(
        JSON.stringify({
          error: `Webhook signature verification failed: ${err}`,
        }),
        { status: 400 }
      );
    }

    console.log(`Received webhook event: ${event.type}`);

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      try {
        const result = await handleCompletedCheckout(event.data.object);
        return new Response(JSON.stringify(result), { status: 200 });
      } catch (error) {
        console.error(`Error processing checkout: ${error}`);
        return new Response(
          JSON.stringify({
            error: `Error processing checkout: ${error}`,
          }),
          { status: 500 }
        );
      }
    }

    // Return 200 for unhandled event types
    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}); 