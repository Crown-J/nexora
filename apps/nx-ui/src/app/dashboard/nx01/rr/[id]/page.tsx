'use client';

import { useParams } from 'next/navigation';

import { RrDetailView } from '@/features/nx01/rr/ui/RrDetailView';

export default function Nx01RrDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id) {
    return <p className="text-sm text-muted-foreground">無效單據</p>;
  }
  return <RrDetailView id={id} />;
}
