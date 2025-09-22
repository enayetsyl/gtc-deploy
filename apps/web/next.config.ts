// apps/web/next.config.ts
import type { NextConfig } from "next";
import path from "path";

// apps/web is two levels below repo root (repo/apps/web)
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next.js 15 supports top-level outputFileTracingRoot
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
