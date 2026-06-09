// apps/nx-ui/src/app/dashboard/inventory/packing/[id]/page.tsx
// 撿包送 LITE-OP-UI 軌 2 2026-06-09：包貨單詳細路由

import { PackingDetailView } from '@/features/inventory/packing/ui/PackingDetailView';

export default async function PackingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PackingDetailView id={decodeURIComponent(id)} />;
}
