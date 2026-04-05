'use client';

import { Suspense } from 'react';

import { PrNewView } from '@/features/nx01/pr/ui/PrNewView';

export default function Nx01PrNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">載入表單…</p>}>
      <PrNewView />
    </Suspense>
  );
}
