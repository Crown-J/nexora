/**
 * File: apps/nx-ui/src/app/dashboard/inventory/stock-take/[id]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 盤點單明細
 */

'use client';

import { useParams } from 'next/navigation';

import { useStockTakeDetail } from '@/features/nx03/stock-take/hooks/useStockTakeDetail';
import { StockTakeDetailView } from '@/features/nx03/stock-take/ui/StockTakeDetailView';

export default function Nx02StockTakeDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const vm = useStockTakeDetail(id);
  return <StockTakeDetailView vm={vm} />;
}
