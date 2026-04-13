import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "../..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: workspaceRoot,
  },
  async redirects() {
    return [
      {
        source: "/base",
        destination: "/dashboard/base",
        permanent: true,
      },
      {
        source: "/base/:path*",
        destination: "/dashboard/base/:path*",
        permanent: true,
      },
    ];
  },
  /**
   * 與 redirects 配套：實際頁面仍位於 `app/base/*`，將 v2 URL 內部轉成既有檔案路徑，避免 404。
   */
  async rewrites() {
    return [
      { source: "/dashboard/base", destination: "/base" },
      { source: "/dashboard/base/:path*", destination: "/base/:path*" },
    ];
  },
};

export default nextConfig;