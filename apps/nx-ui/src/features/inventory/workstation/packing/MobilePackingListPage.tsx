// apps/nx-ui/src/features/inventory/workstation/packing/MobilePackingListPage.tsx
/**
 * 庫存中心 · 包貨清單(BX)。
 *
 * 入口:/dashboard/inventory/packing(Phase 9 從 /dashboard/inventory-mobile/packing 遷來)
 *
 * 操作:
 *   pending → [完成包貨] completePacking → BX completed + 自動建 DN
 *           + SO → delivering
 */

'use client';

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { useSalesStore } from '@/features/sale/ui/fulfillment/store';
import { BX_STATUS_LABEL, type BX, type BXStatus, type SO } from '@/features/sale/ui/fulfillment/types';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | BXStatus;

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待包貨' },
  { id: 'completed', label: '已完成' },
];

const BX_TONE: Record<BXStatus, DocStatusTone> = {
  pending: 'warn',
  packing: 'info',
  completed: 'success',
};

function BXCard({
  bx,
  so,
  onComplete,
}: {
  bx: BX;
  so: SO | undefined;
  onComplete: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{bx.bxNumber}</span>
        <DocStatusBadge tone={BX_TONE[bx.status]}>{BX_STATUS_LABEL[bx.status]}</DocStatusBadge>
      </div>

      {so ? (
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
          <span className="shrink-0 font-mono text-xs text-white/40">{so.customer.code}</span>
          <span className="min-w-0 flex-1 truncate text-white/80">{so.customer.name}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="space-x-2 text-white/50">
          <span>
            撿貨單 <span className="font-mono text-white/70">{bx.relatedPkNumber}</span>
          </span>
          <span>·</span>
          <span>
            關聯 <span className="font-mono text-white/70">{bx.relatedSoNumber}</span>
          </span>
        </span>
        {bx.status !== 'completed' ? (
          <button
            type="button"
            onClick={onComplete}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90"
          >
            完成包貨
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MobilePackingListPage() {
  const bxs = useSalesStore((s) => s.bxs);
  const sos = useSalesStore((s) => s.sos);
  const completePacking = useSalesStore((s) => s.completePacking);

  const [filter, setFilter] = useState<FilterValue>('all');

  const sosByNumber = useMemo(() => {
    const m = new Map<string, SO>();
    for (const s of sos) m.set(s.soNumber, s);
    return m;
  }, [sos]);

  const filtered = useMemo(() => {
    const sorted = [...bxs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (filter === 'all') return sorted;
    return sorted.filter((bx) => bx.status === filter);
  }, [bxs, filter]);

  const pendingCount = bxs.filter((bx) => bx.status !== 'completed').length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 包貨清單</h1>
        <p className="text-xs text-white/50">完成包貨後自動建立送貨單 DN</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cx(
              'inline-flex h-8 items-center rounded-full border px-3 text-xs transition-colors',
              filter === f.id
                ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-white/50 tabular-nums">
        共 {filtered.length} 筆 · 尚待處理 {pendingCount} 筆
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的包貨單
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bx) => (
            <BXCard
              key={bx.id}
              bx={bx}
              so={sosByNumber.get(bx.relatedSoNumber)}
              onComplete={() => completePacking(bx.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
