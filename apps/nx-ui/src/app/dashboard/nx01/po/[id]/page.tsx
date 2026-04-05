'use client';

import { useParams } from 'next/navigation';

import { PoLiteAware } from '@/features/nx01/po/ui/PoLiteAware';
import { PoDetailView } from '@/features/nx01/po/ui/PoDetailView';

export default function Nx01PoDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  return (
    <PoLiteAware>
      {id ? <PoDetailView id={id} /> : <p className="text-sm text-muted-foreground">無效單據</p>}
    </PoLiteAware>
  );
}
