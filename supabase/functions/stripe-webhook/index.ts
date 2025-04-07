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

  // Since we're only using one product with fixed credits (30),
  // we can simplify the credit calculation
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
  return { success: true, credits: totalCredits };
}

// Main request handler
serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the webhook payload and verify its signature
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const body = await req.text();

    // Check all environment variables
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
      return new Response(
        JSON.stringify({
          error: "Configuration error - missing STRIPE_WEBHOOK_SECRET",
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
          error: "Configuration error - missing Supabase environment variables",
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify the webhook signature
    let event;
    try {
      if (!signature) {
        throw new Error("Missing stripe-signature header");
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err}`);
      return new Response(
        JSON.stringify({
          error: `Webhook signature verification failed: ${err}`,
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Received webhook event: ${event.type}`);

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      try {
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
            error: `Error processing checkout: ${error}`,
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }
    
    // Also handle the charge.succeeded event
    if (event.type === "charge.succeeded") {
      // For charge.succeeded, we need to find the associated checkout session
      const charge = event.data.object;
      console.log(`Processing charge.succeeded for payment intent: ${charge.payment_intent}`);
      
      try {
        // We'll try to find the checkout session using the metadata
        // Check if we can extract the user ID from the metadata
        const userId = charge.metadata?.userId;
        
        if (userId) {
          console.log(`Found userId ${userId} in charge metadata`);
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
              stripe_charge_id: charge.id,
              purchase_date: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
            });
            
          if (error) {
            console.error("Error creating credit purchase:", error);
            throw new Error(`Failed to create credit purchase: ${error.message}`);
          }
          
          console.log(`Added ${totalCredits} credits to user ${userId} from charge`);
          return new Response(
            JSON.stringify({ success: true, credits: totalCredits }), 
            { 
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        } else {
          console.log("Charge succeeded but no user ID found in metadata");
          return new Response(
            JSON.stringify({ received: true, type: event.type, warning: "No user ID in charge metadata" }),
            { 
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
      } catch (error) {
        console.error("Error processing charge:", error);
        return new Response(
          JSON.stringify({
            error: "Error processing charge",
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
      JSON.stringify({ received: true, type: event.type }),
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