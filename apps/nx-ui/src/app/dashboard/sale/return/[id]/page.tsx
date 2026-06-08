// apps/nx-ui/src/app/dashboard/nx04/sales-return/[id]/page.tsx
// NX04-M3 C4：SR 銷退單 - detail route

import { SalesReturnDetailView } from '@/features/sale/sales-return/ui/SalesReturnDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SalesReturnDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SalesReturnDetailView id={id} />;
}
