/**
 * File: apps/nx-ui/src/app/dashboard/nx00/partner/page.tsx
 *
 * Purpose:
 * - 舊路徑轉址至主檔 `/base/partner`
 */

import { redirect } from 'next/navigation';

export default function Nx00PartnerLegacyRedirectPage() {
  redirect('/base/partner');
}
