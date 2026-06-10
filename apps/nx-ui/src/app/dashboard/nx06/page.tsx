// apps/nx-ui/src/app/dashboard/nx06/page.tsx
// ROUTE-REALIGN 段 1：nx06 → delivery 業務名化、舊網址留 root redirect（過渡用）

import { redirect } from 'next/navigation';

export default function Nx06RootRedirect(): never {
  redirect('/dashboard/delivery/workspace');
}
