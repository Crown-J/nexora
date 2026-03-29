/**
 * File: apps/nx-ui/src/app/dashboard/nx00/user/page.tsx
 *
 * Purpose:
 * - 舊路徑轉址至主檔 `/base/user`
 */

import { redirect } from 'next/navigation';

export default function Nx00UserLegacyRedirectPage() {
  redirect('/base/user');
}
