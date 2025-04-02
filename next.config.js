/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // This is to handle the canvas.node binary file in the pdfjs-dist package
    config.resolve.alias.canvas = false;
    
    return config;
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 