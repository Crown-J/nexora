// apps/nx-ui/src/app/dashboard/sale/promotion/[id]/page.tsx
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則詳細頁路由

import { PromotionDetailView } from '@/features/sale/promotion/ui/PromotionDetailView';

export default async function PromotionDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PromotionDetailView id={decodeURIComponent(id)} />;
}
