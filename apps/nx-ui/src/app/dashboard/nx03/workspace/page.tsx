// apps/nx-ui/src/app/dashboard/nx03/workspace/page.tsx
// v1.2 對齊軌 FU-04：舊 stub → redirect 到 LITE 庫存中心

import { redirect } from 'next/navigation';

export default function Nx03WorkspaceRedirect() {
  redirect('/dashboard/inventory');
}
