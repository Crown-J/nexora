// apps/nx-ui/src/app/dashboard/nx02/shortage/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、缺貨簿收斂到 /dashboard/inventory/shortage。

import { redirect } from 'next/navigation';

export default function Nx02ShortageRedirect(): never {
  redirect('/dashboard/inventory/shortage');
}
