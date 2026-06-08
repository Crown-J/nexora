// apps/nx-ui/src/app/dashboard/sale/export/page.tsx
// F1-B 銷貨路徑收斂 2026-06-08：URL 不露 nx 代碼、銷退頁直接收斂。
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/sale/return');
}
