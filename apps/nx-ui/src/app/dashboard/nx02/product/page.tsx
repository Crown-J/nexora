// apps/nx-ui/src/app/dashboard/nx02/product/page.tsx
// v1.2 對齊軌 FU-04：舊 stub → redirect 到正式產品管理

import { redirect } from 'next/navigation';

export default function Nx02ProductRedirect() {
  redirect('/dashboard/purchase/product');
}
