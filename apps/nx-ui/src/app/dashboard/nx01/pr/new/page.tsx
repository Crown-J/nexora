'use client';

import { Suspense } from 'react';

import { PrNewForm } from '@/features/nx01/pr/ui/PrNewForm';

export default function Nx01PrNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">載入表單…</p>}>
      <PrNewForm />
    </Suspense>
  );
}
