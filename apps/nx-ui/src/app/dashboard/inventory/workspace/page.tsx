// apps/nx-ui/src/app/dashboard/inventory/workspace/page.tsx
// 庫存路徑收斂 D 2026-06-08：URL 不露 nx 代碼、庫存中心已 hub-less、直送庫存查詢入口。

import { redirect } from 'next/navigation';

export default function Nx03WorkspaceRedirect(): never {
  redirect('/dashboard/inventory/stock-query');
}
