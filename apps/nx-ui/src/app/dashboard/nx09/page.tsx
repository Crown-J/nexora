// apps/nx-ui/src/app/dashboard/nx09/page.tsx
// ROUTE-REALIGN 段 1：nx09 → knowledge 業務名化、舊網址留 root redirect（過渡用）

import { redirect } from 'next/navigation';

export default function Nx09RootRedirect(): never {
  redirect('/dashboard/knowledge/workspace');
}
