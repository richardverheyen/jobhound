import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Log the Supabase configuration for debugging
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("Supabase URL:", supabaseUrl);
  console.log("Supabase Anon Key:", supabaseAnonKey ? "Set" : "Not set");
}

// Function to get the temporary session ID from cookies
const getTemporarySessionIdFromCookies = (): string | null => {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "jobhound_temp_session") {
      return value;
    }
  }
  return null;
};

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      // Always include the temporary session ID in the headers if available
      "x-temporary-session-id":
        typeof window !== "undefined"
          ? getTemporarySessionIdFromCookies() || ""
          : "",
    },
    // This will be executed before each request
    fetch: async (url, options: RequestInit = {}) => {
      // Get the temporary session ID from cookies if available
      const tempSessionId = getTemporarySessionIdFromCookies();

      // Initialize headers if they don't exist
      options.headers = options.headers || {};

      // Convert headers to a Record type that we can manipulate
      const headers: Record<string, string> = {};

      // Copy existing headers if any
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        // Handle array of header entries
        for (const [key, value] of options.headers) {
          headers[key] = value;
        }
      } else if (typeof options.headers === "object") {
        // Handle plain object
        Object.assign(headers, options.headers);
      }

      // Add the temporary session ID to the headers if available
      if (tempSessionId) {
        headers["x-temporary-session-id"] = tempSessionId;
      }

      // Ensure the API key is included in the headers
      if (!headers["apikey"] && !headers["Authorization"]) {
        headers["apikey"] = supabaseAnonKey;
      }

      // Update the options with our modified headers
      options.headers = headers;

      // Log the request details for debugging (only in development)
      if (process.env.NODE_ENV === "development") {
        const urlString = url.toString();
        // Only log non-auth requests to avoid cluttering the console
        if (!urlString.includes("/auth/") && !urlString.includes("/storage/")) {
          console.log(`Supabase request to: ${urlString}`);
          console.log("Headers:", JSON.stringify(headers, null, 2));
        }
      }

      try {
        return await fetch(url, options);
      } catch (error) {
        console.error("Supabase fetch error:", error);
        throw error;
      }
    },
  },
});
