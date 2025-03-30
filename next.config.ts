import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  pageExtensions: ["ts", "tsx", "js", "jsx"].filter(
    (ext) => !ext.includes("supabase/functions")
  ),
  // Configure webpack to handle PDF.js worker
  webpack: (config) => {
    // This prevents worker files from being included in the pages bundle
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/chunks/[name].[hash][ext]',
      },
    });
    
    return config;
  },
};

export default nextConfig;
