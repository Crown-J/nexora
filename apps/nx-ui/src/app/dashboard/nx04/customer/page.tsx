// apps/nx-ui/src/app/dashboard/nx04/customer/page.tsx
// F1-B 銷貨路徑收斂 2026-06-08 + F1-C：原 placeholder 收斂到客戶主檔（六分類含客戶 C）。
// 銷貨視角分頁 /dashboard/sale/customer/info、grading、analysis 已分頁實作、此 placeholder 不再需要。

import { redirect } from 'next/navigation';

export default function Nx04CustomerWorkspaceRedirect(): never {
  redirect('/dashboard/master/partners');
}
