import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Starting apply-migrations function");

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({
          error: "Supabase credentials not configured",
          code: "missing_credentials",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Import dynamically to avoid issues with Deno
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );

    console.log("Creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if pgaudit.exec_sql function exists
    console.log("Checking if pgaudit.exec_sql function exists");
    const { data: functionExists, error: functionCheckError } =
      await supabase.rpc("check_function_exists", {
        function_name: "pgaudit.exec_sql",
      });

    if (functionCheckError) {
      console.error("Error checking function existence:", functionCheckError);
      return new Response(
        JSON.stringify({
          error: "Failed to check if required function exists",
          details: functionCheckError.message,
          code: "function_check_failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!functionExists) {
      console.log(
        "pgaudit.exec_sql function does not exist, using alternative approach"
      );

      // Use a simpler approach to create the credit_history table
      const { error: createTableError } = await supabase
        .from("credit_history")
        .select("id")
        .limit(1);

      if (createTableError && createTableError.code === "PGRST301") {
        console.log("Credit history table doesn't exist, creating it");

        // Create the table using a direct SQL query
        const { error: sqlError } = await supabase.rpc("execute_sql", {
          sql_query: `
            CREATE TABLE IF NOT EXISTS credit_history (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL,
              previous_credits INTEGER NOT NULL,
              new_credits INTEGER NOT NULL,
              change_amount INTEGER NOT NULL,
              source VARCHAR(255) NOT NULL,
              reference_id VARCHAR(255),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              metadata JSONB DEFAULT '{}'::jsonb
            );
            
            ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY IF NOT EXISTS "Users can view their own credit history"
              ON credit_history
              FOR SELECT
              TO authenticated
              USING (auth.uid() = user_id);
          `,
        });

        if (sqlError) {
          console.error("Error creating table:", sqlError);
          return new Response(
            JSON.stringify({
              error: "Failed to create credit_history table",
              details: sqlError.message,
              code: "table_creation_failed",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    } else {
      console.log("Using pgaudit.exec_sql function");

      // Apply credit_history table migration using pgaudit.exec_sql
      const createCreditHistorySQL = `
        -- Create credit_history table if it doesn't exist
        CREATE TABLE IF NOT EXISTS credit_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          previous_credits INTEGER NOT NULL,
          new_credits INTEGER NOT NULL,
          change_amount INTEGER NOT NULL,
          source VARCHAR(255) NOT NULL,
          reference_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'::jsonb
        );

        -- Enable RLS
        ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

        -- Create policy if not exists
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_history' AND policyname = 'Users can view their own credit history') THEN
            CREATE POLICY "Users can view their own credit history"
              ON credit_history
              FOR SELECT
              TO authenticated
              USING (auth.uid() = user_id);
          END IF;
        END $$;
      `;

      // Execute the SQL directly
      const { error } = await supabase.rpc("pgaudit.exec_sql", {
        sql: createCreditHistorySQL,
      });

      if (error) {
        console.error("Error applying migration:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to apply migration",
            details: error.message,
            code: "migration_failed",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("Migration completed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        message: "Migration applied successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error applying migration:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while applying migration",
        details: error instanceof Error ? error.message : String(error),
        code: "unexpected_error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
