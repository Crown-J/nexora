// apps/nx-ui/src/app/dashboard/nx02/warranty-claim/page.tsx
/** 03 收尾 B 2026-06-08：保固申請收斂到 /dashboard/purchase/warranty、URL 不露 nx 代碼。 */

import { redirect } from 'next/navigation';

export default function Nx02WarrantyClaimRedirect(): never {
  redirect('/dashboard/purchase/warranty');
}
