// ROUTE-REALIGN 段 4：nx03 → inventory 業務名化、舊網址留 root redirect（過渡用）

import { redirect } from 'next/navigation';

export default function Nx03RootRedirect(): never {
  redirect('/dashboard/inventory/workspace');
}
