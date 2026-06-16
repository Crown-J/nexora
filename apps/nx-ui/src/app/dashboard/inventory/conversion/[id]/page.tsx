// apps/nx-ui/src/app/dashboard/inventory/conversion/[id]/page.tsx
// NX03-STOCK-LITE M3-3b：重組 / 分解詳情

import { ConversionDetailView } from '@/features/nx03/conversion/ui/ConversionDetailView';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function InventoryConversionDetailRoute({ params }: RouteParams) {
  const { id } = await params;
  return <ConversionDetailView id={id} />;
}
