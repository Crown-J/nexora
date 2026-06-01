// apps/nx-ui/src/app/dashboard/sale/warranty/page.tsx
// v1.2 階段 I P5：舊版路徑 redirect 到 NX02 採購中心（保固申請屬進貨側流程）
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/purchase');
}
