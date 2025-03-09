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
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Import dynamically to avoid issues with Deno
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Apply credit_history table migration directly
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

      -- Add foreign key if possible
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') AND 
           NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'credit_history_user_id_fkey') THEN
          ALTER TABLE credit_history ADD CONSTRAINT credit_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;
      END $$;

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

      -- Create function to track credit changes
      CREATE OR REPLACE FUNCTION track_credit_changes()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.credits IS DISTINCT FROM NEW.credits THEN
          INSERT INTO credit_history (user_id, previous_credits, new_credits, change_amount, source, reference_id, metadata)
          VALUES (
            NEW.id,
            COALESCE(OLD.credits::INTEGER, 0),
            COALESCE(NEW.credits::INTEGER, 0),
            COALESCE(NEW.credits::INTEGER, 0) - COALESCE(OLD.credits::INTEGER, 0),
            COALESCE((NEW.metadata->>'last_credit_source')::VARCHAR, 'unknown'),
            NULL,
            NEW.metadata
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'track_user_credit_changes') THEN
          CREATE TRIGGER track_user_credit_changes
            AFTER UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION track_credit_changes();
        END IF;
      END $$;

      -- Add to realtime publication
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND 
           NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'credit_history') THEN
          ALTER publication supabase_realtime ADD TABLE credit_history;
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
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Migration applied successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error applying migration:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while applying migration",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
