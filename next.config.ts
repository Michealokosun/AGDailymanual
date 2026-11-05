import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./content/readings/**/*.md"],
  },
};

export default nextConfig;
