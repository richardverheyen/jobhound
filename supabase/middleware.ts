import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: "",
              ...options,
            });
          },
        },
      }
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    await supabase.auth.getUser();

    // protected routes
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Check if we have a temporary session ID in the cookies
    const tempSessionId = request.cookies.get("jobhound_temp_session")?.value;

    if (tempSessionId) {
      console.log(
        "Middleware: Found temporary session ID in cookies:",
        tempSessionId
      );

      // Set the temporary session ID as a custom header
      response.headers.set("x-temporary-session-id", tempSessionId);

      try {
        // Set the temporary session ID for RLS policies
        const { error } = await supabase.rpc("set_temporary_session", {
          p_session_id: tempSessionId,
        });

        if (error) {
          console.error(
            "Middleware: Error setting temporary session ID:",
            error
          );
        } else {
          console.log("Middleware: Successfully set temporary session ID");
        }
      } catch (err) {
        console.error("Middleware: Failed to set temporary session ID:", err);
      }
    }

    return response;
  } catch (e) {
    console.error("Middleware error:", e);
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};

/**
 * Middleware to handle Supabase authentication and temporary sessions
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            res.cookies.set({
              name,
              value: "",
              ...options,
            });
          },
        },
      }
    );

    // Check if we have a temporary session ID in the cookies
    const tempSessionId = req.cookies.get("jobhound_temp_session")?.value;

    if (tempSessionId) {
      console.log(
        "Middleware function: Found temporary session ID in cookies:",
        tempSessionId
      );

      // Set the temporary session ID as a custom header
      res.headers.set("x-temporary-session-id", tempSessionId);

      try {
        // Set the temporary session ID for RLS policies
        const { error } = await supabase.rpc("set_temporary_session", {
          p_session_id: tempSessionId,
        });

        if (error) {
          console.error(
            "Middleware function: Error setting temporary session ID:",
            error
          );
        } else {
          console.log(
            "Middleware function: Successfully set temporary session ID"
          );
        }
      } catch (err) {
        console.error(
          "Middleware function: Failed to set temporary session ID:",
          err
        );
      }
    }

    return res;
  } catch (e) {
    console.error("Middleware function error:", e);
    return res;
  }
}
