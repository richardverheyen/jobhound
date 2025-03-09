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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBuyCredits = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Create a form and submit it to Stripe Checkout
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://checkout.stripe.com/create-checkout-session";

      // Add necessary parameters
      const params = {
        success_url: window.location.origin + "/dashboard?payment=success",
        cancel_url: window.location.origin + "/dashboard?payment=cancelled",
        customer_email: userEmail,
        client_reference_id: userId,
        mode: "payment",
        "line_items[0][price]": "price_1R0KqSPPpRvSAmmeOyHZDu3g", // Replace with your actual price ID
        "line_items[0][quantity]": "1",
      };

      // Add parameters to form
      Object.entries(params).forEach(([key, value]) => {
        const hiddenField = document.createElement("input");
        hiddenField.type = "hidden";
        hiddenField.name = key;
        hiddenField.value = value;
        form.appendChild(hiddenField);
      });

      // Add form to body and submit
      document.body.appendChild(form);
      form.submit();

      // Clean up form
      document.body.removeChild(form);

      // We don't need to wait for the redirect since we're submitting a form
      return;
    } catch (error: any) {
      console.error("Error redirecting to checkout:", error);
      setErrorMessage(
        error.message || "Failed to redirect to checkout. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
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
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
    </div>
  );
}
