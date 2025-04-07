# Stripe Implementation for Credit Purchases

This document outlines the implementation of Stripe payments for purchasing credits in the JobHound application.

## Architecture Overview

1. **Frontend Components**:
   - `BuyCreditsButton`: Reusable component for initiating Stripe checkout
   - `/dashboard/credits/buy`: Credit package selection page

2. **Supabase Edge Functions**:
   - `create-checkout`: Creates Stripe checkout sessions
   - `stripe-webhook`: Processes Stripe webhook events

3. **Database Tables**:
   - `credit_purchases`: Records of purchased credits
   - `credit_usage`: Records of credit usage

## Configuration Files

1. **Stripe Fixtures**:
   - `stripe/development.json`: Development environment configuration
   - `stripe/production.json`: Production environment configuration

2. **Type Definitions**:
   - `supabase/functions/types.d.ts`: Type definitions for Deno Edge Functions
   - `supabase/functions/deno.json`: Deno configuration for Edge Functions

## Flow Explanation

1. **Purchasing Credits**:
   - User clicks on "Buy Credits" button either on dashboard or credits/buy page
   - BuyCreditsButton component calls the `create-checkout` edge function
   - Edge function creates a Stripe checkout session with defined credit packages
   - User completes payment on Stripe hosted checkout page
   - Stripe redirects back to the application with success/cancel status

2. **Processing Webhook Events**:
   - Stripe sends a webhook event to the `stripe-webhook` edge function
   - Edge function verifies the signature and processes the event
   - For completed checkouts, credits are added to the user's account
   - Credits are stored in the `credit_purchases` table with expiration date

3. **Using Credits**:
   - When a user scans a resume against a job, a credit is consumed
   - Usage is recorded in the `credit_usage` table

## Credit Packages

Currently, two credit packages are available:
- 10 Credits for $2.00 USD
- 30 Credits for $5.00 USD (best value)

Credits expire 365 days after purchase.

## Required Environment Variables

For proper operation, the following environment variables must be set:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Webhook Events Handled

- `checkout.session.completed`: Creates a credit purchase record

## Testing

To test the implementation locally:
1. Set up Stripe CLI for webhook forwarding
2. Use test cards in Stripe's testing environment
3. Verify credit purchase records in the database

## Important Notes

- All payments are processed through Stripe's secure checkout
- User payment details are not stored in our database
- Credits have a one-year expiration period
- Each scan operation uses exactly one credit 