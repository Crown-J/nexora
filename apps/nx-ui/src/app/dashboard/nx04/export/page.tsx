// apps/nx-ui/src/app/dashboard/nx04/export/page.tsx
// F1-B 銷貨路徑收斂 2026-06-08：URL 不露 nx 代碼、收斂到 /dashboard/sale/return。

import { redirect } from 'next/navigation';

export default function Nx04ExportRedirect(): never {
  redirect('/dashboard/sale/return');
}
