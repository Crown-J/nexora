// apps/nx-ui/src/features/inventory/workstation/ti/MobileInquiryPickupListPage.tsx
/**
 * 庫存中心 · 調貨取貨清單(TI)。
 *
 * 入口:/dashboard/inventory/ti(Phase 9 從 /dashboard/inventory-mobile/ti 遷來)
 *
 * 功能:
 *   - 狀態 chip:全部 / 等待取貨 / 已取回 / 已完成
 *   - TI Card:單號、向哪家同行取、明細、關聯 SO
 *   - 操作:
 *       pending_pickup → [出發取貨] pickupInquiry(TI → picked_up)
 *       picked_up      → [完成入庫] completeInquiry(TI → completed,
 *                        若 SO 其他供應條件達標則自動建 PK)
 *
 * 與「配送調度」頁的「順路取貨」關係:
 *   春酒 demo 可能由倉管組長從配送調度頁指派外務順路取;
 *   實際流程上外務完成取貨後回此頁點「完成入庫」;
 *   Phase 11 會加上拖拉排序 + TI 混入 DN 佇列的演示。
 */

'use client';

import { useMemo, useState } from 'react';
import { Handshake } from 'lucide-react';

import { cx } from '@design/utils/cx';

import { useSalesStore } from '@/features/sale/ui/fulfillment/store';
import {
  TI_STATUS_LABEL,
  type TI,
  type TIStatus,
} from '@/features/sale/ui/fulfillment/types';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | TIStatus;

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'pending_pickup', label: '等待取貨' },
  { id: 'picked_up', label: '已取回' },
  { id: 'completed', label: '已完成' },
];

const TI_TONE: Record<TIStatus, DocStatusTone> = {
  pending_pickup: 'warn',
  picked_up: 'info',
  completed: 'success',
  cancelled: 'muted',
};

function formatTimeAgo(d: Date): string {
  const min = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60_000));
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  return `${Math.floor(hr / 24)} 天前`;
}

function TICard({
  ti,
  onPickup,
  onComplete,
}: {
  ti: TI;
  onPickup: () => void;
  onComplete: () => void;
}) {
  const vendors = Array.from(new Set(ti.items.map((i) => i.vendorName))).join(', ');
  const totalQty = ti.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{ti.tiNumber}</span>
        <DocStatusBadge tone={TI_TONE[ti.status]}>{TI_STATUS_LABEL[ti.status]}</DocStatusBadge>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Handshake className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-white/80">向 {vendors} 取貨</span>
        <span className="shrink-0 text-xs text-white/50 tabular-nums">共 {totalQty} 個</span>
      </div>

      <div className="space-y-1 border-t border-white/10 pt-2 text-xs text-white/70">
        {ti.items.map((i, idx) => (
          <div key={`${i.sku}-${idx}`} className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-white/40">{i.sku}</span>
            <span className="min-w-0 flex-1 truncate">{i.name}</span>
            <span className="shrink-0 tabular-nums text-white/60">×{i.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="text-white/50">
          關聯 <span className="font-mono text-white/70">{ti.relatedSoNumber}</span>
        </span>
        {ti.status === 'pending_pickup' ? (
          <button
            type="button"
            onClick={onPickup}
            className="h-8 rounded border border-[#E8A020]/60 bg-[#E8A020]/5 px-3 text-xs text-[#E8A020] transition-colors hover:bg-[#E8A020]/10"
          >
            出發取貨
          </button>
        ) : ti.status === 'picked_up' ? (
          <button
            type="button"
            onClick={onComplete}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90"
          >
            完成入庫
          </button>
        ) : ti.status === 'completed' && ti.completedAt ? (
          <span className="text-white/50">完成於 {formatTimeAgo(ti.completedAt)}</span>
        ) : null}
      </div>
    </div>
  );
}

export function MobileInquiryPickupListPage() {
  const tis = useSalesStore((s) => s.tis);
  const pickupInquiry = useSalesStore((s) => s.pickupInquiry);
  const completeInquiry = useSalesStore((s) => s.completeInquiry);

  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered = useMemo(() => {
    const sorted = [...tis].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (filter === 'all') return sorted;
    return sorted.filter((ti) => ti.status === filter);
  }, [tis, filter]);

  const pendingCount = tis.filter(
    (ti) => ti.status !== 'completed' && ti.status !== 'cancelled',
  ).length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 調貨取貨清單</h1>
        <p className="text-xs text-white/50">向同行調貨的取貨任務,完成入庫後自動建立撿貨單</p>
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
          目前沒有符合篩選條件的調貨單
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ti) => (
            <TICard
              key={ti.id}
              ti={ti}
              onPickup={() => pickupInquiry(ti.id)}
              onComplete={() => completeInquiry(ti.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
