// apps/nx-ui/src/app/dashboard/nx02/vendor/page.tsx
// v1.2 對齊軌 FU-04：舊 stub → redirect 到正式廠商管理

import { redirect } from 'next/navigation';

export default function Nx02VendorRedirect() {
  redirect('/dashboard/purchase/vendor');
}
