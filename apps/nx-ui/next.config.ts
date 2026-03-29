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
  // ★ 告訴 Vercel build 輸出位置
  distDir: ".next",
};

export default nextConfig;