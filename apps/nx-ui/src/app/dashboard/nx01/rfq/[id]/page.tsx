'use client';

import { useParams } from 'next/navigation';

import { RfqDetailView } from '@/features/nx01/rfq/ui/RfqDetailView';

export default function Nx01RfqDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id) {
    return <p className="text-sm text-muted-foreground">無效單據</p>;
  }
  return <RfqDetailView id={id} />;
}
