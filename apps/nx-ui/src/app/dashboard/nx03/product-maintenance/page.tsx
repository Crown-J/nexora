// apps/nx-ui/src/app/dashboard/nx03/product-maintenance/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、產品（庫存視角）收斂到 /dashboard/purchase/product。
// 產品主檔走進貨命名空間（與採購視角共用單一入口）、進去後分區編輯。

import { redirect } from 'next/navigation';

export default function Nx03ProductMaintenanceRedirect(): never {
  redirect('/dashboard/purchase/product');
}
