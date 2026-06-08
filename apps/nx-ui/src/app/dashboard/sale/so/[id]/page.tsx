// apps/nx-ui/src/app/dashboard/nx04/sales-order/[id]/page.tsx
// NX04-M3 C2：SO 銷貨單 - detail route

import { SoDetailView } from '@/features/sale/so/ui/SoDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SalesOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SoDetailView id={id} />;
}
