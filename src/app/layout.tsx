import "./globals.css";
import { Inter } from "next/font/google";
import { createClient } from "../../supabase/server";
import SupabaseProvider from "@/components/supabase-provider";
import { TempoInit } from "@/components/tempo-init";
import type { Metadata } from "next";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobHound - AI Job Application Assistant",
  description: "AI-powered job application assistant",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <Script src="https://api.tempolabs.ai/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js" />
      <body className={inter.className}>
        <SupabaseProvider session={session}>{children}</SupabaseProvider>
        <TempoInit />
      </body>
    </html>
  );
}
