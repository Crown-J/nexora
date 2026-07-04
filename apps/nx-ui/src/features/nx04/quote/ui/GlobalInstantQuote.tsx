// apps/nx-ui/src/features/nx04/quote/ui/GlobalInstantQuote.tsx
// 全域即時報價：聽 F2 主視窗發的 `nx-instant-quote` 事件 → 開 InstantQuoteDialog
//   （design 層 F2 只 dispatch 事件、不 import nx04，沿用 nx-part-selected 解耦範式）
'use client';

import { useEffect, useState } from 'react';

import { InstantQuoteDialog } from './InstantQuoteDialog';

type Detail = { partId: string; code?: string; name?: string };

export function GlobalInstantQuote() {
  const [target, setTarget] = useState<Detail | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      const ce = e as CustomEvent<Detail>;
      const id = ce.detail?.partId;
      if (typeof id === 'string' && id) setTarget(ce.detail);
    };
    window.addEventListener('nx-instant-quote', h);
    return () => window.removeEventListener('nx-instant-quote', h);
  }, []);

  if (!target) return null;
  return (
    <InstantQuoteDialog
      partId={target.partId}
      code={target.code ?? ''}
      name={target.name ?? ''}
      onClose={() => setTarget(null)}
    />
  );
}
