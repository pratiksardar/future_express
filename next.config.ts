import type { NextConfig } from "next";

const SWAP_GATEWAY_URL = process.env.SWAP_GATEWAY_URL || "http://localhost:4001";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/uniswap/:path*",
        destination: `${SWAP_GATEWAY_URL}/:path*`, // Proxy to Swap Gateway
      },
    ];
  },
};

export default nextConfig;
