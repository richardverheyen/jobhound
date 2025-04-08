// Type definitions for Deno edge functions

// Declare Deno namespace for environment variables
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): { [key: string]: string };
  }

  export const env: Env;
}


// Declare module for Stripe
declare module "https://esm.sh/stripe@13.6.0?target=deno" {
  export interface StripeConstructorOptions {
    apiVersion?: string;
    httpClient?: any;
    maxNetworkRetries?: number;
    timeout?: number;
    host?: string;
    port?: number;
    protocol?: string;
    telemetry?: boolean;
  }

  export interface Product {
    id: string;
    active: boolean;
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  }

  export default class Stripe {
    constructor(apiKey: string, config?: StripeConstructorOptions);
    webhooks: {
      constructEvent(payload: string, signature: string, secret: string): any;
      constructEventAsync(payload: string, signature: string, secret: string): Promise<any>;
    };
    checkout: {
      sessions: {
        create(params: any): Promise<any>;
        listLineItems(sessionId: string, params?: any): Promise<any>;
      };
    };
    prices: {
      list(params?: any): Promise<{ data: any[] }>;
      retrieve(id: string, params?: any): Promise<any>;
    };
    products: {
      retrieve(id: string, params?: any): Promise<any>;
    };

    static createFetchHttpClient(): any;
  }
}

// Declare module for Supabase client
declare module "https://esm.sh/@supabase/supabase-js@2.33.2" {
  export interface SupabaseClientOptions {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
    };
    global?: {
      headers?: Record<string, string>;
      fetch?: any;
    };
    realtime?: {
      params?: {
        eventsPerSecond?: number;
      };
    };
  }

  export interface PostgrestResponse<T = any> {
    data: T | null;
    error: {
      message: string;
      details: string;
      hint: string;
      code: string;
    } | null;
    count: number | null;
    status: number;
    statusText: string;
  }

  export interface PostgrestFilterBuilder<T = any> {
    eq(column: string, value: any): PostgrestFilterBuilder<T>;
    neq(column: string, value: any): PostgrestFilterBuilder<T>;
    gt(column: string, value: any): PostgrestFilterBuilder<T>;
    gte(column: string, value: any): PostgrestFilterBuilder<T>;
    lt(column: string, value: any): PostgrestFilterBuilder<T>;
    lte(column: string, value: any): PostgrestFilterBuilder<T>;
    like(column: string, pattern: string): PostgrestFilterBuilder<T>;
    ilike(column: string, pattern: string): PostgrestFilterBuilder<T>;
    is(column: string, value: any): PostgrestFilterBuilder<T>;
    in(column: string, values: any[]): PostgrestFilterBuilder<T>;
    contains(column: string, value: any): PostgrestFilterBuilder<T>;
    containedBy(column: string, value: any): PostgrestFilterBuilder<T>;
    rangeLt(column: string, range: string): PostgrestFilterBuilder<T>;
    rangeGt(column: string, range: string): PostgrestFilterBuilder<T>;
    rangeGte(column: string, range: string): PostgrestFilterBuilder<T>;
    rangeLte(column: string, range: string): PostgrestFilterBuilder<T>;
    rangeAdjacent(column: string, range: string): PostgrestFilterBuilder<T>;
    overlaps(column: string, value: any): PostgrestFilterBuilder<T>;
    textSearch(column: string, query: string, options?: { config?: string, type?: 'plain' | 'phrase' | 'websearch' }): PostgrestFilterBuilder<T>;
    filter(column: string, operator: string, value: any): PostgrestFilterBuilder<T>;
    not(column: string, operator: string, value: any): PostgrestFilterBuilder<T>;
    or(filters: string): PostgrestFilterBuilder<T>;
    order(column: string, options?: { ascending?: boolean, nullsFirst?: boolean }): PostgrestFilterBuilder<T>;
    limit(count: number): PostgrestFilterBuilder<T>;
    offset(count: number): PostgrestFilterBuilder<T>;
    select(columns?: string): PostgrestFilterBuilder<T>;
    single(): Promise<PostgrestResponse<T>>;
    maybeSingle(): Promise<PostgrestResponse<T | null>>;
  }

  export interface SupabaseClient {
    from<T = any>(table: string): {
      select(columns?: string): PostgrestFilterBuilder<T>;
      insert(values: any | any[], options?: { returning?: 'minimal' | 'representation', count?: 'exact' | 'planned' | 'estimated' }): Promise<PostgrestResponse<T>>;
      upsert(values: any | any[], options?: { returning?: 'minimal' | 'representation', count?: 'exact' | 'planned' | 'estimated', onConflict?: string }): Promise<PostgrestResponse<T>>;
      update(values: any, options?: { returning?: 'minimal' | 'representation', count?: 'exact' | 'planned' | 'estimated' }): PostgrestFilterBuilder<T>;
      delete(options?: { returning?: 'minimal' | 'representation', count?: 'exact' | 'planned' | 'estimated' }): PostgrestFilterBuilder<T>;
    };
    rpc<T = any>(fn: string, params?: object): Promise<PostgrestResponse<T>>;
    auth: {
      getUser(): Promise<{ data: { user: any }, error: any }>;
    };
    functions: {
      invoke(fn: string, options?: { headers?: Record<string, string>, body?: any }): Promise<{ data: any, error: any }>;
    };
  }

  export function createClient(url: string, key: string, options?: SupabaseClientOptions): SupabaseClient;
}

// Declare module for HTTP server
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export interface ServeOptions {
    port?: number;
    hostname?: string;
    handler?: (request: Request) => Response | Promise<Response>;
    onError?: (error: unknown) => Response | Promise<Response>;
    signal?: AbortSignal;
  }

  export type Handler = (request: Request) => Response | Promise<Response>;

  export function serve(handler: Handler, options?: ServeOptions): Promise<void>;
} 