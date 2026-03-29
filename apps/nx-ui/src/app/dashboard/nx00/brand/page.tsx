/**
 * File: apps/nx-ui/src/app/dashboard/nx00/brand/page.tsx
 *
 * Purpose:
 * - 舊路徑轉址至主檔 `/base/brand`
 */

import { redirect } from 'next/navigation';

export default function Nx00BrandLegacyRedirectPage() {
  redirect('/base/brand');
}
