// apps/nx-ui/src/app/dashboard/nx02/ledger/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、庫存台帳收斂到 /dashboard/inventory/ledger。

import { redirect } from 'next/navigation';

export default function Nx02LedgerRedirect(): never {
  redirect('/dashboard/inventory/ledger');
}
