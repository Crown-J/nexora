'use client';

import { Suspense } from 'react';

import { RrNewForm } from '@/features/nx01/rr/ui/RrNewForm';

export default function Nx01RrNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">載入表單…</p>}>
      <RrNewForm />
    </Suspense>
  );
}
