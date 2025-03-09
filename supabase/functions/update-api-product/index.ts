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
    console.log("Starting update-api-product function");

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

    // Find the API Credits product
    console.log("Listing Stripe products");
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
      console.log("Creating new API Credits product");
      try {
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
      } catch (error) {
        console.error("Error creating Stripe product:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to create Stripe product",
            details: error.message,
            code: "product_creation_failed",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Update the product metadata to ensure it has the correct credits value
    console.log("Updating product metadata");
    try {
      const updatedProduct = await stripe.products.update(product.id, {
        metadata: {
          ...product.metadata,
          type: "credits",
          credits: "10",
        },
      });
      product = updatedProduct;
    } catch (error) {
      console.error("Error updating product metadata:", error);
      // Continue with the existing product if update fails
    }

    // Get or create a price for the product
    console.log("Listing prices for product:", product.id);
    let prices;
    try {
      prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });
    } catch (error) {
      console.error("Error listing prices:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to list prices",
          details: error.message,
          code: "price_listing_failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let price;
    if (prices.data.length > 0) {
      price = prices.data[0];
      console.log("Found existing price:", price.id);
    } else {
      // Create a new price if none exists
      console.log("Creating new price for product:", product.id);
      try {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: 1000, // $10.00
          currency: "usd",
          metadata: {
            credits: "10",
          },
        });
        console.log("Created new price:", price.id);
      } catch (error) {
        console.error("Error creating price:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to create price",
            details: error.message,
            code: "price_creation_failed",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("Successfully completed update-api-product function");
    return new Response(
      JSON.stringify({
        success: true,
        product: product,
        price: price,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in update-api-product:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error.message,
        code: "unexpected_error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
