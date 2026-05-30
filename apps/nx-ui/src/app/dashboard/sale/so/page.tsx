// apps/nx-ui/src/app/dashboard/sale/so/page.tsx
// v1.2 對齊軌 FU-04：舊 demo 頁 → redirect 到 LITE 銷貨單工作台

import { redirect } from 'next/navigation';

export default function SaleSoRedirect() {
  redirect('/dashboard/nx04/sales-order');
}
