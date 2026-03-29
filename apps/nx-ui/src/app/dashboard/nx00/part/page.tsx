/**
 * File: apps/nx-ui/src/app/dashboard/nx00/part/page.tsx
 *
 * Purpose:
 * - 舊路徑轉址至主檔 `/base/part`
 */

import { redirect } from 'next/navigation';

export default function Nx00PartLegacyRedirectPage() {
  redirect('/base/part');
}
