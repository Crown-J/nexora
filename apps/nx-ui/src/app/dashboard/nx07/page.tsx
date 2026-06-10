// apps/nx-ui/src/app/dashboard/nx07/page.tsx
// ROUTE-REALIGN 段 1：nx07 → hr 業務名化、舊網址留 root redirect（過渡用）

import { redirect } from 'next/navigation';

export default function Nx07RootRedirect(): never {
  redirect('/dashboard/hr/workspace');
}
