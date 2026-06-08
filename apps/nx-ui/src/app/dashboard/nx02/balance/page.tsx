// apps/nx-ui/src/app/dashboard/nx02/balance/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、庫存一覽收斂到 /dashboard/inventory/balance。

import { redirect } from 'next/navigation';

export default function Nx02BalanceRedirect(): never {
  redirect('/dashboard/inventory/balance');
}
