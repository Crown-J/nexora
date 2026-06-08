// apps/nx-ui/src/app/dashboard/sale/warranty/page.tsx
// 03 收尾 B 2026-06-08：舊版路徑 redirect 到保固申請（保固屬進貨側流程）
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/purchase/warranty');
}
