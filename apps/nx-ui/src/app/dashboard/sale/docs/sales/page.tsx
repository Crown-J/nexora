// apps/nx-ui/src/app/dashboard/sale/docs/sales/page.tsx
// v1.2 階段 I P5：舊版路徑 redirect 到 NX04 銷貨工作台
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/sale/so');
}
