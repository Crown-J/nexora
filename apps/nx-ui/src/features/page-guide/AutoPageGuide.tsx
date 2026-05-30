// apps/nx-ui/src/features/page-guide/AutoPageGuide.tsx
// v1.2 對齊軌 D：自動依 pathname 解析對應 pageKey 並 render PageGuideHost
//
// 用法：放 DashboardShell（全域）、自動偵測 URL 對到內容
// 好處：22 個 LITE 工作台不用各自手動加 <PageGuideHost />

'use client';

import { usePathname } from 'next/navigation';

import { PageGuideHost } from './PageGuideHost';

/// pathname prefix → pageKey 映射表
/// 用 startsWith 比對、第一個命中為準（順序：細到粗）
const PATH_TO_PAGE_KEY: { pathPrefix: string; pageKey: string }[] = [
  // 銷貨 NX04 LITE（5）
  { pathPrefix: '/dashboard/nx04/partner-grade-history', pageKey: 'sale.customer-grade-history' },
  { pathPrefix: '/dashboard/owner/grade-approvals', pageKey: 'sale.customer-grade-history' },
  { pathPrefix: '/dashboard/nx04/sales-order', pageKey: 'sale.so' },
  { pathPrefix: '/dashboard/nx04/sales-return', pageKey: 'sale.sr' },
  { pathPrefix: '/dashboard/nx04/quote', pageKey: 'sale.quote' },

  // 庫存 NX03 LITE（6）
  { pathPrefix: '/dashboard/inventory/stocktake', pageKey: 'inventory.stocktake' },
  { pathPrefix: '/dashboard/inventory/stock-query', pageKey: 'inventory.stock-query' },
  { pathPrefix: '/dashboard/inventory/issue-report', pageKey: 'inventory.issue-report' },
  { pathPrefix: '/dashboard/inventory/conversion', pageKey: 'inventory.conversion' },
  { pathPrefix: '/dashboard/inventory/warehouse/locations', pageKey: 'inventory.location' },
  { pathPrefix: '/dashboard/inventory/part-stock-setting', pageKey: 'inventory.part-stock-setting' },

  // 進貨 NX02（7）
  { pathPrefix: '/dashboard/purchase/rfq', pageKey: 'purchase.rfq' },
  { pathPrefix: '/dashboard/purchase/po', pageKey: 'purchase.po' },
  { pathPrefix: '/dashboard/purchase/rr', pageKey: 'purchase.rr' },
  { pathPrefix: '/dashboard/purchase/vendor', pageKey: 'purchase.vendor' },
  { pathPrefix: '/dashboard/purchase/product', pageKey: 'purchase.product' },
  { pathPrefix: '/dashboard/nx02/warranty-claim', pageKey: 'purchase.warranty-claim' },
  // pr 退貨單沒專屬 page、共用 rr 引導（或者忽略）
  { pathPrefix: '/dashboard/nx02/return', pageKey: 'purchase.pr' },

  // 主檔（4 個核心）
  { pathPrefix: '/dashboard/base/partners', pageKey: 'master.partners' },
  { pathPrefix: '/dashboard/base/parts', pageKey: 'master.parts' },
  { pathPrefix: '/dashboard/base/warehouses', pageKey: 'master.warehouses' },
  { pathPrefix: '/dashboard/base/users', pageKey: 'master.users' },

  // 設定（3）
  { pathPrefix: '/dashboard/settings/roles', pageKey: 'settings.roles' },
  { pathPrefix: '/dashboard/settings/system-param', pageKey: 'settings.system-param' },
  { pathPrefix: '/dashboard/settings/wizard', pageKey: 'settings.wizard' },
];

function resolvePageKey(pathname: string): string | null {
  for (const { pathPrefix, pageKey } of PATH_TO_PAGE_KEY) {
    if (pathname.startsWith(pathPrefix)) return pageKey;
  }
  return null;
}

export function AutoPageGuide() {
  const pathname = usePathname() ?? '';
  const pageKey = resolvePageKey(pathname);
  if (!pageKey) return null;
  return <PageGuideHost pageKey={pageKey} />;
}
