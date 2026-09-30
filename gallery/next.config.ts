import path from "node:path";
import type { NextConfig } from "next";

// The gallery renders ../src, so Turbopack's root (and file tracing) is the
// repo root, not this folder. next.config.ts is transpiled to CommonJS, so
// __dirname is available here.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  async redirects() {
    return [{ source: "/", destination: "/workforce", permanent: false }];
  },
};

export default nextConfig;
