import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, returnUrl } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Initialize Stripe directly
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2023-10-16",
    });

    console.log("Creating checkout directly with user ID:", userId);
    console.log("User email:", userEmail);

    try {
      // Get or create the API Credits product
      console.log("Finding or creating API Credits product");
      let product;

      const products = await stripe.products.list({
        active: true,
        expand: ["data.default_price"],
      });

      // Find a product with credits in the name or metadata
      product = products.data.find(
        (p) =>
          p.name.toLowerCase().includes("credit") ||
          p.metadata?.type === "credits",
      );

      if (!product) {
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
      } else {
        console.log("Found existing API Credits product:", product.id);
      }

      // Get or create a price for the product
      console.log("Finding or creating price for product:", product.id);
      let price;

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

      console.log("Creating Stripe checkout session");
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${returnUrl || req.headers.get("origin") + "/dashboard"}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl || req.headers.get("origin") + "/dashboard"}?canceled=true`,
        ...(userEmail ? { customer_email: userEmail } : {}),
        metadata: {
          userId: userId,
          user_id: userId, // Include both formats to be safe
        },
      });

      console.log("Checkout session created:", session.id);
      return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError);
      return NextResponse.json(
        {
          error: "Failed to create checkout session",
          details: stripeError.message || "Unknown Stripe error",
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Error in create-checkout-direct route:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
