import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to the repo root (parent of web/). Without this,
  // stray package-lock.json files elsewhere on the machine make Turbopack infer
  // the wrong root, which breaks API route-handler (route.ts) resolution.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
