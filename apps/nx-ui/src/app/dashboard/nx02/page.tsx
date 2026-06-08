// apps/nx-ui/src/app/dashboard/nx02/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、進貨從 dock 進、舊 NX02 hub 收斂。

import { redirect } from 'next/navigation';

export default function Nx02HubRedirect(): never {
  redirect('/dashboard/purchase/domestic');
}
