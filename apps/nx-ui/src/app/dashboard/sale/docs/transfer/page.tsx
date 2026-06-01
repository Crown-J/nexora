// apps/nx-ui/src/app/dashboard/sale/docs/transfer/page.tsx
// v1.2 階段 I P5：舊版路徑 redirect 到庫存中心調貨頁（NX03 既有 transfer module）
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/inventory/transfer');
}
