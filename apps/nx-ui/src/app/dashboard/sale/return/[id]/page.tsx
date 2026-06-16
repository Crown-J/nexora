// apps/nx-ui/src/app/dashboard/sale/return/[id]/page.tsx
// NX04-M3 C4：SR 銷退單 - detail route

import { SalesReturnDetailView } from '@/features/nx04/sales-return/ui/SalesReturnDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SalesReturnDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SalesReturnDetailView id={id} />;
}
