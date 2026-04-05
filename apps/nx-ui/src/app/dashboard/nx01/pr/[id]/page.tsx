'use client';

import { useParams } from 'next/navigation';

import { PrDetailView } from '@/features/nx01/pr/ui/PrDetailView';

export default function Nx01PrDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id) {
    return <p className="text-sm text-muted-foreground">無效單據</p>;
  }
  return <PrDetailView id={id} />;
}
