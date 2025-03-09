import { createClient } from "../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, returnUrl } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Call the Supabase Edge Function to create a checkout session
    console.log("Creating checkout with user ID:", userId);
    console.log("User email:", userEmail);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            user_id: userId,
            return_url: returnUrl || `${req.headers.get("origin")}/dashboard`,
            email: userEmail || "", // Include email in the body as well
          },
          headers: {
            "X-Customer-Email": userEmail || "",
          },
        },
      );

      if (error) {
        console.error("Error creating checkout session:", error);
        return NextResponse.json(
          { error: "Failed to create checkout session", details: error },
          { status: 500 },
        );
      }

      return NextResponse.json(data);
    } catch (invokeError) {
      console.error("Error invoking function:", invokeError);
      return NextResponse.json(
        {
          error: "Failed to invoke checkout function",
          details:
            invokeError instanceof Error
              ? invokeError.message
              : String(invokeError),
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Error in create-checkout route:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
