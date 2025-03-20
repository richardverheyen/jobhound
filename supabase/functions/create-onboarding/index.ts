// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @deno-types="https://esm.sh/@supabase/supabase-js@2.7.1"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface RequestBody {
  session_id: string;
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

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace("Bearer ", "");

    // Get the Supabase URL and service role key from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
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

    // Verify the JWT token and get the user ID
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !userData?.user) {
      console.error("Error validating JWT token:", authError);
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Invalid or expired token",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const userId = userData.user.id;

    // Parse the request body
    let sessionId: string;
    try {
      const body = (await req.json()) as RequestBody;
      sessionId = body.session_id;

      if (!sessionId) {
        return new Response(
          JSON.stringify({
            error: "Missing session_id",
            details: "The session_id field is required",
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

    // Validate the onboarding session first
    const { data: validationData, error: validationError } = await supabaseAdmin.rpc(
      "validate_onboarding_session",
      { p_session_id: sessionId }
    );

    if (validationError || !validationData.valid) {
      console.error("Invalid or expired onboarding session:", validationError || validationData);
      return new Response(
        JSON.stringify({
          error: "Invalid or expired session",
          details: "The provided session is invalid or has expired",
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

    // Now complete the onboarding process
    const { data, error } = await supabaseAdmin.rpc("complete_onboarding", {
      p_user_id: userId,
      p_session_id: sessionId,
    });

    if (error) {
      console.error("Error completing onboarding:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to complete onboarding",
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

    // Return the success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Onboarding completed successfully",
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