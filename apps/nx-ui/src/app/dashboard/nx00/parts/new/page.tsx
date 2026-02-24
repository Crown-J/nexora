/**
 * File: apps/nx-ui/src/app/dashboard/nx00/parts/new/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTS-PAGE-002：Legacy route redirect (/new -> query mode=new)
 *
 * Notes:
 * - 舊路由保留避免書籤/連結失效
 * - 導向：/dashboard/nx00/parts?mode=new
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Nx00PartsNewRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/nx00/parts?mode=new');
  }, [router]);

  return null;
}