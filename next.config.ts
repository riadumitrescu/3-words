import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configure images if needed
  images: {
    domains: [],
  },
};

export default nextConfig;
