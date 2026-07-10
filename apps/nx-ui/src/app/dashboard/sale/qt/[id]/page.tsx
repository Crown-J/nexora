// apps/nx-ui/src/app/dashboard/sale/qt/[id]/page.tsx
// NX04-QT-SHELL：報價單深連結 → 工作區開在「詳細資料」分頁（保留舊書籤可用）

import { QuoteWorkbench } from '@/features/nx04/quote/ui/QuoteWorkbench';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function Nx04QuoteDetailRoute({ params }: RouteParams) {
  const { id } = await params;
  return <QuoteWorkbench initialId={id} initialTab="detail" />;
}
