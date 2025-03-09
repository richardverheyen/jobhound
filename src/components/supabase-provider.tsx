"use client";

import { createContext, useContext, useEffect } from "react";
import { supabase } from "../../supabase/supabase";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";

const Context = createContext<{ session: Session | null }>({ session: null });

export default function SupabaseProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const router = useRouter();

  useEffect(() => {
    // Set the session in the Supabase client
    supabase.auth.setSession({
      access_token: session?.access_token || "",
      refresh_token: session?.refresh_token || "",
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession?.access_token !== session?.access_token) {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session, router]);

  return <Context.Provider value={{ session }}>{children}</Context.Provider>;
}

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};
