// apps/nx-ui/src/app/dashboard/report/finance/ar-overview/page.tsx
// 對帳查詢（九宮格 銷售第 7 格）
// 2026-08-01 v3.0.0：原本是施工中的佔位頁（畫面上還把內部代號印給使用者看），
//   改成規格 §4.2 要的東西——業務出貨前看客戶有沒有逾期。

import { ArCheckView } from '@/features/nx08/ar-check/ui/ArCheckView';

export default function Nx08ArCheckRoute() {
  return <ArCheckView />;
}
