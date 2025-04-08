import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.2";

// Initialize Stripe with the secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Set default credit validity period (1 year in days)
const DEFAULT_VALIDITY_DAYS = 365;

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

/**
 * Handle a completed checkout session by adding credits to the user's account
 */
async function handleCompletedCheckout(session: any) {
  console.log("Processing completed checkout:", session.id);

  // Get the user ID from the session metadata
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("User ID not found in session metadata", session.metadata);
    throw new Error("User ID not found in session metadata");
  }

  console.log(`Found userId ${userId} in session metadata`);
  
  // For simplicity, we're using a fixed credit amount of 30
  const totalCredits = 30;
  const validityDays = DEFAULT_VALIDITY_DAYS;

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
  return { success: true, credits: totalCredits, userId };
}

// Main request handler
// This is a webhook that doesn't require authentication - it uses the Stripe signature to verify
serve(async (req) => {
  // Debug info about the request
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders 
    });
  }
  
  try {
    // Parse the webhook payload
    const body = await req.text();
    console.log("Received webhook body:", body.substring(0, 200) + "...");
    
    // Get the Stripe signature
    const signature = req.headers.get("stripe-signature");
    console.log("Stripe signature:", signature ? "present" : "missing");
    
    // Get webhook secret
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    console.log("Webhook secret:", webhookSecret ? "configured" : "missing");
    
    // Check required environment variables
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
      return new Response(
        JSON.stringify({
          error: "Configuration error - missing STRIPE_WEBHOOK_SECRET"
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({
          error: "Configuration error - missing Supabase environment variables"
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Construct and verify the event
    let event;
    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(
        JSON.stringify({
          error: "Missing stripe-signature header"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    try {
      // Use constructEventAsync instead of constructEvent for async environments
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err}`);
      return new Response(
        JSON.stringify({
          error: `Webhook signature verification failed: ${err}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Received webhook event: ${event.type}`, event.data.object.id);

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      try {
        console.log("Processing checkout.session.completed event");
        const result = await handleCompletedCheckout(event.data.object);
        return new Response(
          JSON.stringify(result), 
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } catch (error) {
        console.error(`Error processing checkout: ${error}`);
        return new Response(
          JSON.stringify({
            error: `Error processing checkout: ${error}`
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }
    
    // Also handle the payment_intent.succeeded event
    if (event.type === "payment_intent.succeeded") {
      try {
        // For payment_intent.succeeded, check if it has the user ID in the metadata
        const paymentIntent = event.data.object;
        const userId = paymentIntent.metadata?.userId;
        
        if (userId) {
          console.log(`Found userId ${userId} in payment intent metadata`);
          // Add credits directly using the fixed amount
          const totalCredits = 30;
          const validityDays = DEFAULT_VALIDITY_DAYS;
          
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
              stripe_payment_intent_id: paymentIntent.id,
              purchase_date: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
            });
            
          if (error) {
            console.error("Error creating credit purchase:", error);
            throw new Error(`Failed to create credit purchase: ${error.message}`);
          }
          
          console.log(`Added ${totalCredits} credits to user ${userId} from payment intent`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              credits: totalCredits, 
              userId 
            }), 
            { 
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        } else {
          console.log("Payment intent succeeded but no user ID found in metadata");
          return new Response(
            JSON.stringify({ 
              received: true, 
              type: event.type, 
              warning: "No user ID in payment intent metadata" 
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
      } catch (error) {
        console.error("Error processing payment intent:", error);
        return new Response(
          JSON.stringify({
            error: "Error processing payment intent",
            details: error instanceof Error ? error.message : String(error),
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // Return 200 for unhandled event types
    return new Response(
      JSON.stringify({ 
        received: true, 
        type: event.type 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}); 