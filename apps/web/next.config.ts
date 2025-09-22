// apps/web/next.config.ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Ensure Next's file tracing starts at the monorepo root so nft paths are consistent on Vercel
    // @ts-expect-error: Not yet in published Next.js type defs
    // apps/web is two levels below repo root (repo/apps/web)
    outputFileTracingRoot: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
