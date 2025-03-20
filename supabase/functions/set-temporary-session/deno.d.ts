// Deno global namespace
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
}

// Declare modules for Deno imports
declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.7.1" {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): any;
}
