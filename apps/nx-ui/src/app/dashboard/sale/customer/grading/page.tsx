// apps/nx-ui/src/app/dashboard/sale/customer/grading/page.tsx
// v1.2 階段 I P5：舊版路徑 redirect 到主檔中心客戶等級頁
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/master/customer-grade');
}
