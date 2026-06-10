// apps/nx-ui/src/app/dashboard/inventory/warehouse-setting/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、倉位管理收斂到 /dashboard/inventory/warehouse。

import { redirect } from 'next/navigation';

export default function Nx03WarehouseSettingRedirect(): never {
  redirect('/dashboard/inventory/warehouse');
}
