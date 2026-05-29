// apps/nx-ui/src/app/dashboard/nx04/domestic/page.tsx
// NX04-M3 C7：舊 placeholder redirect 至 sales-order（避免舊 bookmark 404）

import { redirect } from 'next/navigation';

export default function Nx04DomesticRedirect() {
  redirect('/dashboard/nx04/sales-order');
}
