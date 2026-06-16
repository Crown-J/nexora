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

      // 主檔 base/ → master/ URL 業務名重命名（P6-2、2026-06-16）
      { source: "/dashboard/base", destination: "/dashboard/master", permanent: true },
      { source: "/dashboard/base/:path*", destination: "/dashboard/master/:path*", permanent: true },
      { source: "/base", destination: "/dashboard/master", permanent: true },
      { source: "/base/:path*", destination: "/dashboard/master/:path*", permanent: true },
      { source: "/user", destination: "/dashboard/master/users", permanent: true },

      // 段 4 移除：inventory/* → nx03/* 過時、inventory 已是真實 hub + workspace 子頁

      { source: "/dashboard/sales", destination: "/dashboard/sale", permanent: true },
      { source: "/dashboard/sales/domestic", destination: "/dashboard/sale/so", permanent: true },

      // 段 2 移除：finance/* 跟 report/* 已是真實 hub + 子頁、舊 redirects 全刪
      // 段 2 移除：原 report/{workspace,daily,monthly,export} → nx08/workspace 過時

      { source: "/dashboard/bulletin", destination: "/dashboard", permanent: true },

      // 段 4 移除：nx03/{workbench,customer-sales} → nx04/* 過時、nx03 路徑已轉 inventory + sale

      { source: "/dashboard/sales/export", destination: "/dashboard/sale/return", permanent: true },
      { source: "/dashboard/sales/customer", destination: "/dashboard/master/partners", permanent: true },
    ];
  },
};

export default nextConfig;
