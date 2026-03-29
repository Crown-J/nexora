/**
 * File: apps/nx-ui/src/app/dashboard/nx00/role-view/page.tsx
 *
 * Purpose:
 * - 舊路徑轉址至主檔 `/base/role-view`
 */

import { redirect } from 'next/navigation';

export default function Nx00RoleViewLegacyRedirectPage() {
  redirect('/base/role-view');
}
