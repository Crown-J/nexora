// apps/nx-ui/src/app/dashboard/purchase/page.tsx
/** 03 收尾 B 2026-06-08：移除採購中心 Hub（手冊「進貨沒有採購中心」）。
 *  進採購一律走 dock 或星球選單（採購需求 / 詢價 / 採購單 / 進貨單 / 退貨單 / 國外 / 保固）。
 *  /dashboard/purchase 自身只 redirect 到流程第一步「採購需求」。 */

import { redirect } from 'next/navigation';

export default function PurchaseHubRedirect(): never {
  redirect('/dashboard/purchase/domestic');
}
