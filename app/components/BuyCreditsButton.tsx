'use client';

import { useState } from 'react';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

interface BuyCreditsButtonProps {
  userId?: string;
  variant?: 'default' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  label?: string;
  returnUrl?: string;
  onSuccess?: (sessionId: string) => void;
}

export default function BuyCreditsButton({
  userId,
  variant = 'default',
  size = 'medium',
  className = '',
  label = 'Buy Credits',
  returnUrl = '/dashboard',
  onSuccess
}: BuyCreditsButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Set base classes based on variant and size
  let baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition';
  
  // Add variant-specific classes
  if (variant === 'default') {
    baseClasses += ' bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
  } else if (variant === 'outline') {
    baseClasses += ' border border-blue-500 text-blue-600 hover:bg-blue-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
  } else if (variant === 'text') {
    baseClasses += ' text-blue-600 hover:text-blue-700 hover:underline';
  }
  
  // Add size-specific classes
  if (size === 'small') {
    baseClasses += ' px-2.5 py-1.5 text-xs';
  } else if (size === 'medium') {
    baseClasses += ' px-4 py-2 text-sm';
  } else if (size === 'large') {
    baseClasses += ' px-6 py-3 text-base';
  }
  
  // Add any custom classes
  const buttonClasses = `${baseClasses} ${className}`;
  
  const handleClick = async () => {
    setIsLoading(true);
    
    try {
      // If userId wasn't provided as a prop, get the current user
      let userIdToUse = userId;
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Redirect to login if user is not authenticated
          router.push('/auth/login');
          return;
        }
        userIdToUse = user.id;
      }
      
      // Calculate absolute return URL including the origin
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const absoluteReturnUrl = `${origin}${returnUrl}`;
      
      // Call the create-checkout Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          user_id: userIdToUse,
          return_url: absoluteReturnUrl,
          mode: 'credit-selection'
        }
      });
      
      if (error) {
        console.error('Error creating checkout:', error);
        throw new Error(`Failed to create checkout: ${error.message || 'Unknown error'}`);
      }
      
      if (!data || !data.url) {
        throw new Error('No checkout URL returned from server');
      }
      
      // If onSuccess callback is provided, call it with the session ID
      if (onSuccess && data.sessionId) {
        onSuccess(data.sessionId);
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error during checkout process:', error);
      alert('Failed to start checkout process. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button 
      onClick={handleClick}
      className={buttonClasses}
      disabled={isLoading}
      data-testid="buy-credits-button"
    >
      {isLoading ? (
        <div className="flex items-center">
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processing...
        </div>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
} 