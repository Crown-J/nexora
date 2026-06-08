/**
 * File: apps/nx-ui/src/app/dashboard/nx02/ledger/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 庫存台帳（QUERY）
 */

'use client';

import { useLedger } from '@/features/nx02/ledger/hooks/useLedger';
import { LedgerView } from '@/features/nx02/ledger/ui/LedgerView';

export default function Nx02LedgerPage() {
  const vm = useLedger();
  return <LedgerView vm={vm} />;
}
