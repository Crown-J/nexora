// apps/nx-ui/src/app/dashboard/sale/docs/quote/page.tsx
// v1.2 階段 I P5：舊版路徑 redirect 到 NX04 對應頁（不破壞既有連結）
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/sale/qt');
}
