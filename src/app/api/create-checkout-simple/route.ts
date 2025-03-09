import { createClient } from "../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

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

    console.log("Creating simple checkout for user ID:", userId);
    console.log("User email:", userEmail);

    try {
      // Generate a unique session ID
      const sessionId = uuidv4();

      // Add 10 credits directly to the user
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("credits")
        .eq("user_id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user:", userError);
        return NextResponse.json(
          { error: "Failed to fetch user" },
          { status: 500 },
        );
      }

      // Calculate new credits total
      const currentCredits = parseInt(userData.credits || "0");
      const creditsToAdd = 10;
      const newCredits = currentCredits + creditsToAdd;

      // Update user credits
      const { error: updateError } = await supabase
        .from("users")
        .update({
          credits: newCredits.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating user credits:", updateError);
        return NextResponse.json(
          { error: "Failed to update user credits" },
          { status: 500 },
        );
      }

      // Try to add to credit history if it exists
      try {
        await supabase.from("credit_history").insert({
          user_id: userId,
          previous_credits: currentCredits,
          new_credits: newCredits,
          change_amount: creditsToAdd,
          source: "direct_purchase",
          reference_id: sessionId,
          metadata: {
            timestamp: new Date().toISOString(),
            email: userEmail,
          },
        });
      } catch (historyError) {
        // Continue even if credit history fails
        console.log("Credit history table might not exist yet");
      }

      // Return success with redirect URL
      const successUrl = `${returnUrl || req.headers.get("origin") + "/dashboard"}?session_id=${sessionId}`;

      return NextResponse.json({
        sessionId: sessionId,
        url: successUrl,
        message: "Credits added successfully",
        creditsAdded: creditsToAdd,
        newTotal: newCredits,
      });
    } catch (error: any) {
      console.error("Error in simple checkout:", error);
      return NextResponse.json(
        {
          error: "Failed to process checkout",
          details: error.message || "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Error in create-checkout-simple route:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
