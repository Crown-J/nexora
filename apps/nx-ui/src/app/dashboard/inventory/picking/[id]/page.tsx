// apps/nx-ui/src/app/dashboard/inventory/picking/[id]/page.tsx
// 撿包送 LITE-OP-UI 軌 1 2026-06-09：撿貨單詳細路由

import { PickingDetailView } from '@/features/inventory/picking/ui/PickingDetailView';

export default async function PickingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PickingDetailView id={decodeURIComponent(id)} />;
}
