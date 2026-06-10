import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "../..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  turbopack: {
    root: workspaceRoot,
  },
  async redirects() {
    return [
      { source: "/home", destination: "/dashboard", permanent: true },

      { source: "/purchase/rfq", destination: "/dashboard/purchase/rfq", permanent: false },
      { source: "/purchase/po", destination: "/dashboard/purchase/po", permanent: false },
      { source: "/purchase/rr", destination: "/dashboard/purchase/rr", permanent: false },
      { source: "/sale/qt", destination: "/dashboard/sale/qt", permanent: false },
      { source: "/sale/so", destination: "/dashboard/sale/so", permanent: false },

      { source: "/base", destination: "/dashboard/base", permanent: true },
      { source: "/base/:path*", destination: "/dashboard/base/:path*", permanent: true },
      { source: "/user", destination: "/dashboard/base/users", permanent: true },

      { source: "/dashboard/inventory/workspace", destination: "/dashboard/nx03/workspace", permanent: true },
      { source: "/dashboard/inventory/setting", destination: "/dashboard/nx03/warehouse-setting", permanent: true },

      { source: "/dashboard/sales", destination: "/dashboard/sale", permanent: true },
      { source: "/dashboard/sales/domestic", destination: "/dashboard/nx04/domestic", permanent: true },

      // 段 2 移除：finance/* 跟 report/* 已是真實 hub + 子頁、舊 redirects 全刪
      // 段 2 移除：原 report/{workspace,daily,monthly,export} → nx08/workspace 過時

      { source: "/dashboard/bulletin", destination: "/dashboard", permanent: true },

      { source: "/dashboard/nx03/workbench", destination: "/dashboard/nx04/domestic", permanent: true },
      { source: "/dashboard/nx03/customer-sales", destination: "/dashboard/nx04/domestic", permanent: true },

      { source: "/dashboard/nx04", destination: "/dashboard/nx05/workspace", permanent: false },

      { source: "/dashboard/sales/export", destination: "/dashboard/nx04/export", permanent: true },
      { source: "/dashboard/sales/customer", destination: "/dashboard/nx04/customer", permanent: true },
    ];
  },
};

export default nextConfig;
