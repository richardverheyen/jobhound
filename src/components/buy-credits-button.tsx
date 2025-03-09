"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "../../supabase/supabase";

interface BuyCreditsButtonProps {
  userId: string;
  userEmail: string;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function BuyCreditsButton({
  userId,
  userEmail,
  variant = "default",
  size = "default",
  className = "",
}: BuyCreditsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyCredits = async () => {
    setIsLoading(true);
    try {
      // First, ensure we have the latest credits product
      const { data: productData, error: productError } =
        await supabase.functions.invoke("update-api-product");

      if (productError) {
        console.error("Product error:", productError);
        throw new Error("Failed to get latest product information");
      }

      if (!productData?.price?.id) {
        console.error(
          "No price ID returned from update-api-product:",
          productData
        );
        throw new Error("No price ID returned from the server");
      }

      // Use the price ID from the response
      const priceId = productData.price.id;
      console.log("Using price ID:", priceId);

      // Create a one-time payment checkout session
      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            price_id: priceId,
            user_id: userId,
            return_url: `${window.location.origin}/dashboard`,
            mode: "payment", // One-time payment instead of subscription
          },
          headers: {
            "X-Customer-Email": userEmail || "",
          },
        }
      );

      if (error) {
        console.error("Checkout error:", error);
        throw error;
      }

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data);
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert("Failed to create checkout session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBuyCredits}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        "Buy Credits"
      )}
    </Button>
  );
}
