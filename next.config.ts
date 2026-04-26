import type { NextConfig } from "next";

const SWAP_GATEWAY_URL = process.env.SWAP_GATEWAY_URL || "http://localhost:4001";

const nextConfig: NextConfig = {
  // @napi-rs/canvas ships native bindings (`.node` files) loaded via @node-rs/helper.
  // Turbopack/Webpack can't statically bundle those, so mark the package external
  // and let Node `require` it from `node_modules` at runtime. Pretext only needs
  // canvas for measureText — used by the playcard text fitter.
  serverExternalPackages: ["@napi-rs/canvas"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow widget pages to be embedded in any iframe
        source: "/widget/:marketId*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
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
