// apps/nx-ui/src/app/dashboard/inventory/delivery/[id]/page.tsx
// 撿包送 LITE-OP-UI 軌 3 2026-06-09：配送單詳細路由
// query kind=DELIVERY|RETURN_PICKUP 決定走哪個 endpoint

import { DeliveryDetailView } from '@/features/inventory/delivery/ui/DeliveryDetailView';

export default async function DeliveryDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = await params;
  const { kind } = await searchParams;
  const dnKind = kind === 'RETURN_PICKUP' ? 'RETURN_PICKUP' : 'DELIVERY';
  return <DeliveryDetailView id={decodeURIComponent(id)} kind={dnKind} />;
}
