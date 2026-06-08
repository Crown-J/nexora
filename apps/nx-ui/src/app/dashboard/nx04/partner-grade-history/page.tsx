// apps/nx-ui/src/app/dashboard/nx04/partner-grade-history/page.tsx
// F1-B 銷貨路徑收斂 2026-06-08：URL 不露 nx 代碼、客戶分級沿革收斂到 /dashboard/sale/partner-grade-history。

import { redirect } from 'next/navigation';

export default function Nx04PartnerGradeHistoryRedirect(): never {
  redirect('/dashboard/sale/partner-grade-history');
}
