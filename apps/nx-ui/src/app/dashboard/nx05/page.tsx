// apps/nx-ui/src/app/dashboard/nx05/page.tsx
// ROUTE-REALIGN 段 2：nx05 → finance 業務名化、舊網址留 root redirect（過渡用）

import { redirect } from 'next/navigation';

export default function Nx05RootRedirect(): never {
  redirect('/dashboard/finance');
}
