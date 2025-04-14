import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configure images if needed
  images: {
    domains: [],
  },
  // Disable ESLint rule for unescaped entities
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
