/**
 * File: apps/nx-ui/src/app/dashboard/nx02/balance/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 庫存一覽（QUERY）
 */

'use client';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { useBalance } from '@/features/nx02/balance/hooks/useBalance';
import { BalanceView } from '@/features/nx02/balance/ui/BalanceView';

function isPlusPlan(code: string | null | undefined): boolean {
  const p = (code ?? '').trim().toUpperCase();
  return p === 'PLUS' || p === 'PRO';
}

export default function Nx02BalancePage() {
  const { me } = useSessionMe();
  const vm = useBalance();
  return <BalanceView vm={vm} showPlus={isPlusPlan(me?.plan_code)} />;
}
