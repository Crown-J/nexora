/**
 * File: apps/nx-ui/src/app/dashboard/nx02/stock-take/new/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 新增盤點單
 */

'use client';

import { useStockTakeNew } from '@/features/nx02/stock-take/hooks/useStockTakeNew';
import { StockTakeNewView } from '@/features/nx02/stock-take/ui/StockTakeNewView';

export default function Nx02StockTakeNewPage() {
  const vm = useStockTakeNew();
  return <StockTakeNewView vm={vm} />;
}
