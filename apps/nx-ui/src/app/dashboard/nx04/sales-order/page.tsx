// apps/nx-ui/src/app/dashboard/nx04/sales-order/page.tsx
// F1-B 銷貨路徑收斂 2026-06-08：URL 不露 nx 代碼、銷貨單收斂到 /dashboard/sale/so。

import { redirect } from 'next/navigation';

export default function Nx04SalesOrderRedirect(): never {
  redirect('/dashboard/sale/so');
}
