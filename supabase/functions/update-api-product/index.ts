import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Find the API Credits product
    const products = await stripe.products.list({
      active: true,
      metadata: { type: "credits" },
    });

    let product;
    if (products.data.length > 0) {
      product = products.data[0];
      console.log("Found existing API Credits product:", product.id);
    } else {
      // Create a new product if none exists
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

    // Update the product metadata to ensure it has the correct credits value
    const updatedProduct = await stripe.products.update(product.id, {
      metadata: {
        ...product.metadata,
        type: "credits",
        credits: "10",
      },
    });

    // Get or create a price for the product
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    let price;
    if (prices.data.length > 0) {
      price = prices.data[0];
      console.log("Found existing price:", price.id);
    } else {
      // Create a new price if none exists
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

    return new Response(
      JSON.stringify({
        success: true,
        product: updatedProduct,
        price: price,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error updating API product:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while updating the API product",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
