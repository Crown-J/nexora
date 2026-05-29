// apps/nx-ui/src/app/dashboard/nx04/export/page.tsx
// NX04-M3 C7：舊 placeholder redirect 至 sales-return（避免舊 bookmark 404）

import { redirect } from 'next/navigation';

export default function Nx04ExportRedirect() {
  redirect('/dashboard/nx04/sales-return');
}
