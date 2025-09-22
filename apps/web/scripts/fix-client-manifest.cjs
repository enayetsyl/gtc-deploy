#!/usr/bin/env node
/**
 * Workaround for Vercel ENOENT on (protected)/page_client-reference-manifest.js
 * If Next.js lists the file in the nft trace but doesn't emit it, we synthesize
 * a minimal empty manifest so Vercel's lstat/copy phase succeeds.
 */
const fs = require("fs");
const path = require("path");

const protectedDir = path.join(
  __dirname,
  "..",
  ".next",
  "server",
  "app",
  "(protected)"
);
const target = path.join(protectedDir, "page_client-reference-manifest.js");

if (!fs.existsSync(protectedDir)) {
  console.warn("[fix-client-manifest] Protected directory not found, skipping");
  process.exit(0);
}

if (!fs.existsSync(target)) {
  const stub =
    "export const clientReferences = {};\nexport default clientReferences;\n";
  try {
    fs.writeFileSync(target, stub, "utf8");
    console.log(
      "[fix-client-manifest] Created stub client-reference manifest at",
      target
    );
  } catch (e) {
    console.error("[fix-client-manifest] Failed to create stub manifest:", e);
    process.exitCode = 1;
  }
} else {
  console.log(
    "[fix-client-manifest] Manifest already exists, no action needed"
  );
}
