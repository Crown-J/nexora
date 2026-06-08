// apps/nx-ui/src/app/dashboard/nx02/import/page.tsx
// 03 收尾 B 2026-06-08：舊 nx02/import → 國外進貨追蹤（採購中心 Hub 已移除、改 dock 進入）

import { redirect } from 'next/navigation';

export default function Nx02ImportRedirect() {
  redirect('/dashboard/purchase/foreign');
}
