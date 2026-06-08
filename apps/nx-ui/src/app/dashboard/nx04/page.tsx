// apps/nx-ui/src/app/dashboard/nx04/page.tsx
// F1-B 銷貨路徑收斂 2026-06-08：URL 不露 nx 代碼、銷貨 hub 收斂到 /dashboard/sale/*。

import { redirect } from 'next/navigation';

export default function Nx04HubRedirect(): never {
  redirect('/dashboard/sale/so');
}
