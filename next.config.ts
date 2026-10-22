import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Roda fora da Vercel também (DEPLOYMENT.md › Saída da Vercel).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
