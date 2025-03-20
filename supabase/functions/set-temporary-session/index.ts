// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @deno-types="https://esm.sh/@supabase/supabase-js@2.7.1"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface RequestBody {
  session_id: string;
}

type DenoRequest = Request;

serve(async (req: DenoRequest) => {
  try {
    // Log request headers for debugging
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    // Get the Supabase URL and anon key from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "Missing Supabase URL or anon key in environment variables"
      );
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          details: "Missing Supabase URL or anon key",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create a Supabase client with the anon key
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Get the session ID from the request
    let sessionId: string;
    try {
      const body = (await req.json()) as RequestBody;
      sessionId = body.session_id;
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Session ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Setting temporary session ID:", sessionId);

    // Set the app.temporary_session_id setting for RLS policies
    const { data, error } = await supabaseClient.rpc("set_config", {
      parameter: "app.temporary_session_id",
      value: sessionId,
    });

    if (error) {
      console.error("Error setting config:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to set temporary session",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return the success response
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Function error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
