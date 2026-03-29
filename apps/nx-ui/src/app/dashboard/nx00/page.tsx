/**
 * File: apps/nx-ui/src/app/dashboard/nx00/page.tsx
 *
 * Purpose:
 * - NX00 儀表板路徑已廢止：主檔改為 `/base`，此處永久轉址。
 */

import { redirect } from 'next/navigation';

export default function Nx00ModuleRootPage() {
  redirect('/base');
}
