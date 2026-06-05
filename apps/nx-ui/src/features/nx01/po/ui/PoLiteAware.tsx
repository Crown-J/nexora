/**
 * File: apps/nx-ui/src/features/nx01/po/ui/PoLiteAware.tsx
 *
 * [4-1] 2026-06-05：NX-MANUAL-02 v2.0 §④ 對齊：
 * 採購單功能屬 PLUS / PRO、對 LITE 客戶「隱藏不顯示」。
 *
 * 原本對 LITE 顯示 PLUS 升級提示卡 + PoPlusTeaser，現改為 redirect 回首頁。
 */

'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';

export function PoLiteAware({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { planCode } = useSessionMe();
  const showPlus = planSupportsNx02PlusFeatures(planCode);

  useEffect(() => {
    if (!showPlus) router.replace('/dashboard');
  }, [showPlus, router]);

  if (!showPlus) return null;
  return <>{children}</>;
}
