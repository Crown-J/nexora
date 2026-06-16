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

      // NX0X URL 退場（P7-1、2026-06-16）：對外 URL 用業務中文名、nx0X 全收斂到對應業務路徑
      // 原 app/dashboard/nx0X/* 都是 redirect stub、改成 next.config 統一管、刪實體 page.tsx
      // nx01 → 採購（歷史 TASK-0420 v2 範式、保留現有行為，未來若改 nx01 → master 再調）
      { source: "/dashboard/nx01", destination: "/dashboard/purchase/domestic", permanent: true },
      // nx02 採購 + 庫存兩個業務面（採購主軸 + 庫存延伸動作）
      { source: "/dashboard/nx02", destination: "/dashboard/purchase/domestic", permanent: true },
      { source: "/dashboard/nx02/auto-replenish", destination: "/dashboard/inventory/auto-replenish", permanent: true },
      { source: "/dashboard/nx02/balance", destination: "/dashboard/inventory/balance", permanent: true },
      { source: "/dashboard/nx02/domestic", destination: "/dashboard/purchase/domestic", permanent: true },
      { source: "/dashboard/nx02/import", destination: "/dashboard/purchase/foreign", permanent: true },
      { source: "/dashboard/nx02/init", destination: "/dashboard/inventory/init", permanent: true },
      { source: "/dashboard/nx02/ledger", destination: "/dashboard/inventory/ledger", permanent: true },
      { source: "/dashboard/nx02/product", destination: "/dashboard/purchase/product", permanent: true },
      { source: "/dashboard/nx02/shortage", destination: "/dashboard/inventory/shortage", permanent: true },
      { source: "/dashboard/nx02/transfer", destination: "/dashboard/inventory/transfer", permanent: true },
      { source: "/dashboard/nx02/vendor", destination: "/dashboard/purchase/vendor", permanent: true },
      { source: "/dashboard/nx02/warranty-claim", destination: "/dashboard/purchase/warranty", permanent: true },
      // nx03 → inventory
      { source: "/dashboard/nx03", destination: "/dashboard/inventory/workspace", permanent: true },
      // nx04 → sale（customer 分支接主檔 partners）
      { source: "/dashboard/nx04", destination: "/dashboard/sale/so", permanent: true },
      { source: "/dashboard/nx04/customer", destination: "/dashboard/master/partners", permanent: true },
      { source: "/dashboard/nx04/domestic", destination: "/dashboard/sale/so", permanent: true },
      { source: "/dashboard/nx04/export", destination: "/dashboard/sale/return", permanent: true },
      { source: "/dashboard/nx04/partner-grade-history", destination: "/dashboard/sale/partner-grade-history", permanent: true },
      { source: "/dashboard/nx04/quote", destination: "/dashboard/sale/qt", permanent: true },
      { source: "/dashboard/nx04/sales-order", destination: "/dashboard/sale/so", permanent: true },
      { source: "/dashboard/nx04/sales-return", destination: "/dashboard/sale/return", permanent: true },
      // nx05 → finance
      { source: "/dashboard/nx05", destination: "/dashboard/finance", permanent: true },
      // nx06 → delivery（物流）
      { source: "/dashboard/nx06", destination: "/dashboard/delivery/workspace", permanent: true },
      // nx07 → hr（人資）
      { source: "/dashboard/nx07", destination: "/dashboard/hr/workspace", permanent: true },
      // nx08 → report
      { source: "/dashboard/nx08", destination: "/dashboard/report", permanent: true },
      // nx09 → knowledge
      { source: "/dashboard/nx09", destination: "/dashboard/knowledge/workspace", permanent: true },
    ];
  },
};

export default nextConfig;
