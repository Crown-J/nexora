// apps/nx-ui/src/app/dashboard/nx02/domestic/page.tsx
// v1.2 對齊軌 FU-04：舊 stub → redirect 到正式路徑

import { redirect } from 'next/navigation';

export default function Nx02DomesticRedirect() {
  redirect('/dashboard/purchase/domestic');
}
