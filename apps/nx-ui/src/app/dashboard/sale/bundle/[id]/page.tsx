// apps/nx-ui/src/app/dashboard/sale/bundle/[id]/page.tsx
// F2 組合套餐 2026-06-09：詳細頁路由

import { BundleDetailView } from '@/features/sale/bundle/ui/BundleDetailView';

export default async function BundleDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BundleDetailView id={decodeURIComponent(id)} />;
}
