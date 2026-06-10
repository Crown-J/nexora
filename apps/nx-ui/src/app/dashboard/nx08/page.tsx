// apps/nx-ui/src/app/dashboard/nx08/page.tsx
// ROUTE-REALIGN 段 2：nx08 → report 業務名化、舊網址留 root redirect（過渡用）

import { redirect } from 'next/navigation';

export default function Nx08RootRedirect(): never {
  redirect('/dashboard/report');
}
