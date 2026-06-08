// apps/nx-ui/src/app/dashboard/nx04/sales-return/page.tsx
// F1-B 銷貨路徑收斂 2026-06-08：URL 不露 nx 代碼、銷退單收斂到 /dashboard/sale/return。

import { redirect } from 'next/navigation';

export default function Nx04SalesReturnRedirect(): never {
  redirect('/dashboard/sale/return');
}
