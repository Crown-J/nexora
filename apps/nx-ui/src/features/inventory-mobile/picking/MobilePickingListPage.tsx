// apps/nx-ui/src/features/inventory-mobile/picking/MobilePickingListPage.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 7:庫存中心 · 撿貨清單(PK)。
 *
 * 入口:/dashboard/inventory-mobile/picking
 *
 * 功能:
 *   - 狀態 chip:全部 / 待撿貨 / 撿貨中 / 已完成
 *   - PK Card:單號、關聯 SO、客戶、品項數 / 件數、動作按鈕
 *   - 操作:
 *       pending / picking → [完成撿貨] completePicking
 *         → PK → completed + 自動建 BX + SO → packed
 *
 * Phase 9 會擴充為逐項掃條碼 + 庫位指引;Phase 7 僅做 stub 可跑通流程。
 */

'use client';

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { useSalesStore } from '@/features/sale/ui/fulfillment/store';
import { PK_STATUS_LABEL, type PK, type PKStatus, type SO } from '@/features/sale/ui/fulfillment/types';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | PKStatus;

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待撿貨' },
  { id: 'picking', label: '撿貨中' },
  { id: 'completed', label: '已完成' },
];

const PK_TONE: Record<PKStatus, DocStatusTone> = {
  pending: 'warn',
  picking: 'info',
  completed: 'success',
};

function PKCard({
  pk,
  so,
  onComplete,
}: {
  pk: PK;
  so: SO | undefined;
  onComplete: () => void;
}) {
  const itemLines = pk.items.length;
  const totalQty = pk.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{pk.pkNumber}</span>
        <DocStatusBadge tone={PK_TONE[pk.status]}>{PK_STATUS_LABEL[pk.status]}</DocStatusBadge>
      </div>

      {so ? (
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
          <span className="shrink-0 font-mono text-xs text-white/40">{so.customer.code}</span>
          <span className="min-w-0 flex-1 truncate text-white/80">{so.customer.name}</span>
        </div>
      ) : null}

      <div className="space-y-1 border-t border-white/10 pt-2 text-xs text-white/70">
        {pk.items.slice(0, 3).map((i, idx) => (
          <div key={`${i.sku}-${idx}`} className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-white/40">{i.sku}</span>
            <span className="min-w-0 flex-1 truncate">{i.name}</span>
            <span className="shrink-0 tabular-nums text-white/60">×{i.quantity}</span>
          </div>
        ))}
        {pk.items.length > 3 ? (
          <div className="text-white/40">…另 {pk.items.length - 3} 項</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="text-white/50 tabular-nums">
          {itemLines} 項 / {totalQty} 件 · 關聯{' '}
          <span className="font-mono text-white/70">{pk.relatedSoNumber}</span>
        </span>
        {pk.status !== 'completed' ? (
          <button
            type="button"
            onClick={onComplete}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90"
          >
            完成撿貨
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MobilePickingListPage() {
  const pks = useSalesStore((s) => s.pks);
  const sos = useSalesStore((s) => s.sos);
  const completePicking = useSalesStore((s) => s.completePicking);

  const [filter, setFilter] = useState<FilterValue>('all');

  const sosByNumber = useMemo(() => {
    const m = new Map<string, SO>();
    for (const s of sos) m.set(s.soNumber, s);
    return m;
  }, [sos]);

  const filtered = useMemo(() => {
    const sorted = [...pks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (filter === 'all') return sorted;
    return sorted.filter((pk) => pk.status === filter);
  }, [pks, filter]);

  const pendingCount = pks.filter((pk) => pk.status !== 'completed').length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 撿貨清單</h1>
        <p className="text-xs text-white/50">完成撿貨後自動建立包貨單 BX</p>
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
          目前沒有符合篩選條件的撿貨單
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pk) => (
            <PKCard
              key={pk.id}
              pk={pk}
              so={sosByNumber.get(pk.relatedSoNumber)}
              onComplete={() => completePicking(pk.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
