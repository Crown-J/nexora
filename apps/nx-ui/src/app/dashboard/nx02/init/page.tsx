// apps/nx-ui/src/app/dashboard/nx02/init/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、開帳單收斂到 /dashboard/inventory/init。

import { redirect } from 'next/navigation';

export default function Nx02InitRedirect(): never {
  redirect('/dashboard/inventory/init');
}
