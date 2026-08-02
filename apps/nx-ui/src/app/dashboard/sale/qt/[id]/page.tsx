// apps/nx-ui/src/app/dashboard/sale/qt/[id]/page.tsx
// 報價單檢視（v3.0.0 檢視殼）。⚠️ 2026-08-02 從舊的 QuoteWorkbench 詳細分頁換成檢視殼。
// 清單頁 /dashboard/sale/qt 仍是舊版 QuoteWorkbench，⛔ 這一輪不動它。

import { QuoteDetailShell } from '@/features/nx04/quote/ui/QuoteDetailShell';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function Nx04QuoteDetailRoute({ params }: RouteParams) {
  const { id } = await params;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <QuoteDetailShell id={id} />
    </div>
  );
}
