import type { NextConfig } from "next";

/**
 * Two build modes:
 *  • sandbox/dev (default)      → output: "standalone"
 *  • BUILD_MODE=pages (CI)      → output: "export" → ./out for GitHub Pages
 *    NEXT_PUBLIC_BASE_PATH is set by the workflow when the repo is NOT
 *    <user>.github.io (project pages serve from /<repo>/).
 */
const isPages = process.env.BUILD_MODE === "pages";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isPages ? { output: "export" as const } : { output: "standalone" as const }),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  allowedDevOrigins: ["preview-chat-a6140da2-a034-4317-bac5-e344eb1b142a.space-z.ai"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
