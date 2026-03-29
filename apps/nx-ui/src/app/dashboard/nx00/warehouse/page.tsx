/**
 * File: apps/nx-ui/src/app/dashboard/nx00/warehouse/page.tsx
 *
 * Purpose:
 * - 舊路徑轉址至主檔 `/base/location`（倉庫＋庫位）
 */

import { redirect } from 'next/navigation';

export default function Nx00WarehouseLegacyRedirectPage() {
  redirect('/base/location');
}
