// apps/nx-ui/src/app/dashboard/sale/page.tsx
/** F1-B 銷貨路徑收斂 2026-06-08：移除銷貨中心 Hub（手冊範式「沒中間 hub 頁」）。
 *  進銷貨一律走 dock 或星球選單（報價單 / 銷貨單 / 銷退單 / 客戶 / 客戶分級沿革）。
 *  /dashboard/sale 自身只 redirect 到「銷貨單」（最常用入口）。 */

import { redirect } from 'next/navigation';

export default function SaleHubRedirect(): never {
  redirect('/dashboard/sale/so');
}
