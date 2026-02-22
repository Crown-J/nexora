/**
 * File: apps/nx-ui/src/app/dashboard/nx00/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROOT-001：NX00 模組入口（預設導向）
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROOT-001-F01
 * 說明：
 * - 進入 /dashboard/nx00 時，先導到預設功能頁
 * - 你可以改成 users 或 nx00 的 module home
 */
export default function Nx00RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/nx00/users');
  }, [router]);

  return null;
}