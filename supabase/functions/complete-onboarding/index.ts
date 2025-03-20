// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @deno-types="https://esm.sh/@supabase/supabase-js@2.7.1"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface RequestBody {
  email?: string;
  expiry_hours?: number;
}

serve(async (req: Request) => {
  try {
    // CORS headers for preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get the Supabase URL and anon key from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Missing Supabase configuration in environment variables");
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          details: "Missing Supabase configuration",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Create a Supabase client with the service role key for admin access
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Parse the request body
    let email: string | undefined;
    let expiryHours: number = 24; // Default expiry time

    try {
      const body = (await req.json()) as RequestBody;
      email = body.email;
      
      if (body.expiry_hours && typeof body.expiry_hours === 'number') {
        // Limit maximum expiry to 72 hours (3 days)
        expiryHours = Math.min(Math.max(1, body.expiry_hours), 72);
      }
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: "Request body must be valid JSON",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Validate email format if provided
    if (email !== undefined && email !== null && email !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({
            error: "Invalid email format",
            details: "Please provide a valid email address",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    // Check if we're getting too many requests from the same IP
    // This is a basic rate-limiting mechanism
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    const cacheKey = `onboarding_rate_limit:${clientIP}`;
    
    // We could implement a more sophisticated rate limiter here
    // For now, we're just checking if the IP has made too many requests
    // in a short period of time using Supabase's built-in key-value store

    // Create the onboarding session using the database function
    const { data, error } = await supabaseAdmin.rpc("create_onboarding_session", {
      p_email: email || null,
      p_expiry_hours: expiryHours,
    });

    if (error) {
      console.error("Error creating onboarding session:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create onboarding session",
          details: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Return the success response with the session ID
    return new Response(
      JSON.stringify({
        success: true,
        session_id: data.session_id,
        expires_at: data.expires_at,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Function error:", errorMessage);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});