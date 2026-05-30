// apps/nx-ui/src/app/dashboard/sale/return/page.tsx
// v1.2 對齊軌 FU-04：舊 placeholder → redirect 到 LITE 銷退單工作台

import { redirect } from 'next/navigation';

export default function SaleReturnRedirect() {
  redirect('/dashboard/nx04/sales-return');
}
