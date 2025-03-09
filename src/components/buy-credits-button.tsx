"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

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
      // Use a direct Stripe payment link
      // This payment link was created using the Stripe Dashboard or API
      const paymentLink = "https://buy.stripe.com/test_cN25lL9bL1r88Qo288";

      // Redirect to the payment link
      window.location.href = paymentLink;
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
