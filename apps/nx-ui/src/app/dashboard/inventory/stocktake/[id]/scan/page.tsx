// apps/nx-ui/src/app/dashboard/inventory/stocktake/[id]/scan/page.tsx
// v1.2 階段 G P6：盤點手機掃條碼模式入口
'use client';

import { use } from 'react';

import { MobileStocktakeScanPage } from '@/features/nx03/workstation/stocktake/MobileStocktakeScanPage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MobileStocktakeScanPage id={id} />;
}
