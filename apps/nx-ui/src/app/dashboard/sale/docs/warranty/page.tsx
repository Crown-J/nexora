// apps/nx-ui/src/app/dashboard/sale/docs/warranty/page.tsx
// v1.2 階段 I P5：舊版路徑 redirect 到 NX02 保固理賠工作台
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/purchase');
}
