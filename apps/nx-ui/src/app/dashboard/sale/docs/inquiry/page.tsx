// apps/nx-ui/src/app/dashboard/sale/docs/inquiry/page.tsx
// v1.2 階段 I P5：舊版路徑 redirect 到 NX04 報價工作台（調貨詢價走報價單路徑）
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/sale/qt');
}
