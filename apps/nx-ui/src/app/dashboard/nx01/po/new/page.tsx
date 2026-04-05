'use client';

import { PoLiteAware } from '@/features/nx01/po/ui/PoLiteAware';
import { PoNewView } from '@/features/nx01/po/ui/PoNewView';

export default function Nx01PoNewPage() {
  return (
    <PoLiteAware>
      <PoNewView />
    </PoLiteAware>
  );
}
