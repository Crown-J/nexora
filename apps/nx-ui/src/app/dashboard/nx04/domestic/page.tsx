// apps/nx-ui/src/app/dashboard/nx04/domestic/page.tsx
// F1-B 銷貨路徑收斂 2026-06-08：URL 不露 nx 代碼、收斂到 /dashboard/sale/so。

import { redirect } from 'next/navigation';

export default function Nx04DomesticRedirect(): never {
  redirect('/dashboard/sale/so');
}
