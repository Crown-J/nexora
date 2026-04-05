'use client';

import { Suspense } from 'react';

import { PoLiteAware } from '@/features/nx01/po/ui/PoLiteAware';
import { PoNewForm } from '@/features/nx01/po/ui/PoNewForm';

export default function Nx01PoNewPage() {
  return (
    <PoLiteAware>
      <Suspense fallback={<p className="text-sm text-muted-foreground">載入表單…</p>}>
        <PoNewForm />
      </Suspense>
    </PoLiteAware>
  );
}
