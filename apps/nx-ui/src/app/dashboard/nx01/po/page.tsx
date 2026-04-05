'use client';

import { PoLiteAware } from '@/features/nx01/po/ui/PoLiteAware';
import { PoListView } from '@/features/nx01/po/ui/PoListView';

export default function Nx01PoListPage() {
  return (
    <PoLiteAware>
      <PoListView />
    </PoLiteAware>
  );
}
