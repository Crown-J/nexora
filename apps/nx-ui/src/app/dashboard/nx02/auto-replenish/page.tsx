// apps/nx-ui/src/app/dashboard/nx02/auto-replenish/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、自動補貨收斂到 /dashboard/inventory/auto-replenish。

import { redirect } from 'next/navigation';

export default function Nx02AutoReplenishRedirect(): never {
  redirect('/dashboard/inventory/auto-replenish');
}
