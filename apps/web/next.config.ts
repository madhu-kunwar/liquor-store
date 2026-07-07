import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@liquor-erp/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  }
};

export default nextConfig;
