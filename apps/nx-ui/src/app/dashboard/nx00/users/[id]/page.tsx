/**
 * File: apps/nx-ui/src/app/dashboard/nx00/users/[id]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-REDIRECT-ID-001：舊 /[id] 路由相容（redirect）
 *
 * Notes:
 * - 舊路由：/dashboard/nx00/users/<id>
 * - 新路由：/dashboard/nx00/users?id=<id>
 * - 若 id 空值：回到 /dashboard/nx00/users（避免產生 ?id=）
 */

import { redirect } from 'next/navigation';

type PageProps = {
  params: { id: string };
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-REDIRECT-ID-001-F01
 * 說明：
 * - redirect 舊 /[id] → ?id=<id>
 */
export default function UsersIdRedirectPage({ params }: PageProps) {
  const id = params?.id ?? '';
  if (!id) redirect('/dashboard/nx00/users');
  redirect(`/dashboard/nx00/users?id=${encodeURIComponent(id)}`);
}