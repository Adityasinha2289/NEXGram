import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * This directory, not the repository root.
   *
   * The repo holds two applications with their own lockfiles - the Vite app at
   * the root and this one - so Next.js inferred the workspace root as the
   * parent and warned on every build. Pinning it also keeps the build from
   * tracing files belonging to the other app.
   */
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
