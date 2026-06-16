// apps/nx-ui/src/app/dashboard/sale/qt/[id]/page.tsx
// NX04-M3 C1：QT 報價單詳情

import { QuoteDetailView } from '@/features/nx04/quote/ui/QuoteDetailView';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function Nx04QuoteDetailRoute({ params }: RouteParams) {
  const { id } = await params;
  return <QuoteDetailView id={id} />;
}
