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

      { source: "/dashboard/finance/workspace", destination: "/dashboard/nx05/workspace", permanent: true },
      { source: "/dashboard/finance/receivable", destination: "/dashboard/nx05/workspace", permanent: true },
      { source: "/dashboard/finance/payable", destination: "/dashboard/nx05/workspace", permanent: true },
      { source: "/dashboard/finance/cash", destination: "/dashboard/nx05/workspace", permanent: true },
      { source: "/dashboard/finance/notes", destination: "/dashboard/nx05/workspace", permanent: true },
      { source: "/dashboard/finance/closing", destination: "/dashboard/nx05/workspace", permanent: true },

      { source: "/dashboard/report/workspace", destination: "/dashboard/nx08/workspace", permanent: true },
      { source: "/dashboard/report/daily", destination: "/dashboard/nx08/workspace", permanent: true },
      { source: "/dashboard/report/monthly", destination: "/dashboard/nx08/workspace", permanent: true },
      { source: "/dashboard/report/export", destination: "/dashboard/nx08/workspace", permanent: true },

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
