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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Check if a credits product already exists
    const existingProducts = await stripe.products.list({
      active: true,
      metadata: {
        type: "credits",
      },
    });

    let product;
    let price;

    if (existingProducts.data.length > 0) {
      // Use existing product
      product = existingProducts.data[0];

      // Get its price
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      if (prices.data.length > 0) {
        price = prices.data[0];
      }
    }

    // If no existing product or price, create new ones
    if (!product) {
      product = await stripe.products.create({
        name: "API Credits",
        description: "10 API calls for CV-Job matching service",
        active: true,
        metadata: {
          type: "credits",
          credits: "10",
        },
      });
    }

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 1000, // $10.00
        currency: "usd",
        metadata: {
          credits: "10",
        },
      });
    }

    return new Response(
      JSON.stringify({
        product: product,
        price: price,
        priceId: price.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error handling credits product:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
