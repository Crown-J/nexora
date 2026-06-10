/**
 * File: apps/nx-ui/src/app/dashboard/inventory/stock-take/new/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 新增盤點單
 */

'use client';

import { useStockTakeNew } from '@/features/nx03/stock-take/hooks/useStockTakeNew';
import { StockTakeNewView } from '@/features/nx03/stock-take/ui/StockTakeNewView';

export default function Nx02StockTakeNewPage() {
  const vm = useStockTakeNew();
  return <StockTakeNewView vm={vm} />;
}
