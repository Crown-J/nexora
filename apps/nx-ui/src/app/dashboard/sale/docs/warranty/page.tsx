// apps/nx-ui/src/app/dashboard/sale/docs/warranty/page.tsx
// 03 收尾 B 2026-06-08：舊版路徑 redirect 到保固申請（採購中心 Hub 已移除）
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/purchase/warranty');
}
