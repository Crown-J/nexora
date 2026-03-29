/**
 * File: apps/nx-ui/src/app/base/users/page.tsx
 *
 * Purpose:
 * - 舊路徑 /base/users 永久轉址至 /base/user
 */

import { redirect } from 'next/navigation';

export default function BaseUsersLegacyRedirectPage() {
  redirect('/base/user');
}
