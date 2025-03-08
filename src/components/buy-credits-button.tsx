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
      // Use the existing credits price
      const priceId = "price_1R0KqSPPpRvSAmmeOyHZDu3g"; // 10 credits for $10 USD

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
        throw error;
      }

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
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
