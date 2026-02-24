/**
 * File: apps/nx-ui/src/app/dashboard/nx00/parts/[id]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTS-PAGE-003：Legacy route redirect (/:id -> query id=)
 *
 * Notes:
 * - 舊路由保留避免書籤/連結失效
 * - 導向：/dashboard/nx00/parts?id=<id>
 */

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function Nx00PartsIdRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    const id = params?.id ? String(params.id) : '';
    if (!id) return;
    router.replace(`/dashboard/nx00/parts?id=${encodeURIComponent(id)}`);
  }, [router, params]);

  return null;
}