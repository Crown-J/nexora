/**
 * File: apps/nx-ui/src/app/dashboard/nx00/role/page.tsx
 *
 * Purpose:
 * - 舊路徑轉址至主檔 `/base/role`
 */

import { redirect } from 'next/navigation';

export default function Nx00RoleLegacyRedirectPage() {
  redirect('/base/role');
}
