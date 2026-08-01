// apps/nx-ui/src/app/dashboard/sale/warranty/page.tsx
// 保固查詢（九宮格 銷售第 8 格）
//
// 2026-08-01 v3.0.0：原本這裡是 redirect 到 /dashboard/purchase/warranty（保固求償）。
//   ⚠️ 那是不同的功能——規格 §4.2 把兩者分在兩個角色：
//     · 銷售「保固查詢」＝ 業務查客戶這顆還在不在保固內
//     · 採購「保固求償」＝ 向供應商求償的單據流程
//   轉址等於銷售這一格沒有自己的功能，改成真的做一頁。

import { WarrantyCheckView } from '@/features/nx04/warranty-check/ui/WarrantyCheckView';

export default function Nx04WarrantyCheckRoute() {
  return <WarrantyCheckView />;
}
