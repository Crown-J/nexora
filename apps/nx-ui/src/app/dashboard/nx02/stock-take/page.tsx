/**
 * File: apps/nx-ui/src/app/dashboard/nx02/stock-take/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 盤點單清單
 */

'use client';

import { useStockTakeList } from '@/features/nx03/stock-take/hooks/useStockTakeList';
import { StockTakeListView } from '@/features/nx03/stock-take/ui/StockTakeListView';

export default function Nx02StockTakeListPage() {
  const vm = useStockTakeList();
  return <StockTakeListView vm={vm} />;
}
