// apps/nx-ui/src/app/dashboard/sale/customer/analysis/page.tsx
// v1.2 階段 I P5：舊版路徑 redirect 到 NX08 銷售報表（客戶角度）
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/report/sales');
}
