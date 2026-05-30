// apps/nx-ui/src/app/dashboard/sale/qt/page.tsx
// v1.2 對齊軌 FU-04：舊 demo 頁 → redirect 到 LITE 報價單工作台

import { redirect } from 'next/navigation';

export default function SaleQtRedirect() {
  redirect('/dashboard/nx04/quote');
}
