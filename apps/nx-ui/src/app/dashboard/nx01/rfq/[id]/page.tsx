/**
 * File: apps/nx-ui/src/app/dashboard/nx01/rfq/[id]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 缺貨簿關聯 RFQ 的導向頁（NX01 詢價模組尚未完整時顯示單號）
 */

'use client';

import { useParams } from 'next/navigation';

export default function Nx01RfqStubPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  return (
    <div className="rounded-xl border border-border/80 bg-card/40 p-6 text-sm">
      <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
      <h1 className="mt-1 text-lg font-semibold">詢價單（RFQ）</h1>
      <p className="mt-3 text-muted-foreground">
        單號：<span className="font-mono text-foreground">{id || '—'}</span>
      </p>
      <p className="mt-2 text-muted-foreground">NX01 詢價模組完整版將於後續提供；資料已由後端建立於 nx01_rfq。</p>
    </div>
  );
}
