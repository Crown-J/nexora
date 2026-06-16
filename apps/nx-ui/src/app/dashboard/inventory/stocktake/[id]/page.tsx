// apps/nx-ui/src/app/dashboard/inventory/stocktake/[id]/page.tsx
// NX03-STOCK-LITE M3-1：盤點單詳情

import { StocktakeDetailView } from '@/features/nx03/stocktake/ui/StocktakeDetailView';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function InventoryStocktakeDetailRoute({ params }: RouteParams) {
  const { id } = await params;
  return <StocktakeDetailView id={id} />;
}
