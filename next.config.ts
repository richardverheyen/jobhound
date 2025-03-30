import type { NextConfig } from "next";
import { join } from 'path';

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
    // PDF.js worker configuration
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use path.join to ensure proper path resolution
      'pdfjs-dist': join(__dirname, 'node_modules/pdfjs-dist'),
    };

    return config;
  },
};

export default nextConfig;
