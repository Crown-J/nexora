/**
 * File: apps/nx-ui/src/app/dashboard/purchase/page.tsx
 *
 * Purpose:
 * - 採購中心首頁（路由 v2：`/dashboard/purchase`）
 * - 流程卡片 + 子選單（NX02-DASH）
 */

import { PurchaseCenterHub } from '@/features/purchase/ui/PurchaseCenterHub';

export default function PurchaseHubPage() {
  return <PurchaseCenterHub />;
}
