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
      console.log("Starting checkout with user ID:", userId);
      console.log("User email:", userEmail);

      const response = await fetch("/api/create-checkout-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          userEmail: userEmail || "",
          returnUrl: window.location.origin + "/success",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to the Stripe checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Error redirecting to checkout:", error);
      setErrorMessage(
        error.message || "Failed to redirect to checkout. Please try again.",
      );
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
