// apps/nx-ui/src/features/nx04/quote/ui/GlobalInstantInquiry.tsx
// 全域即時詢價：聽 F2 主視窗發的 `nx-instant-inquiry` 事件 → 開 InstantInquiryDialog
//   （design 層 F2 只 dispatch 事件、不 import nx04，沿用 nx-instant-quote 解耦範式）
'use client';

import { useEffect, useState } from 'react';

import { InstantInquiryDialog } from './InstantInquiryDialog';

type Detail = { partId: string; code?: string; name?: string };

export function GlobalInstantInquiry() {
  const [target, setTarget] = useState<Detail | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      const ce = e as CustomEvent<Detail>;
      const id = ce.detail?.partId;
      if (typeof id === 'string' && id) setTarget(ce.detail);
    };
    window.addEventListener('nx-instant-inquiry', h);
    return () => window.removeEventListener('nx-instant-inquiry', h);
  }, []);

  if (!target) return null;
  return (
    <InstantInquiryDialog
      partId={target.partId}
      code={target.code ?? ''}
      name={target.name ?? ''}
      onClose={() => setTarget(null)}
    />
  );
}
