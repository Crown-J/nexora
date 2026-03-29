/**
 * File: apps/nx-ui/src/app/dashboard/nx00/user-role/page.tsx
 *
 * Purpose:
 * - 舊路徑轉址至主檔占位 `/base/user-role`（畫面仍為占位／後續可接 NX00 UI）
 */

import { redirect } from 'next/navigation';

export default function Nx00UserRoleLegacyRedirectPage() {
  redirect('/base/user-role');
}
