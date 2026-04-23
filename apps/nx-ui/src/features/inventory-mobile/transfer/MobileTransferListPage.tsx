// apps/nx-ui/src/features/inventory-mobile/transfer/MobileTransferListPage.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 6:庫存中心 · 調撥清單(手機版)。
 *
 * 入口:/dashboard/inventory-mobile/transfer(臨時路徑,Phase 8 庫存中心
 * 4 分區重構時會遷到 /dashboard/inventory-mobile/workstation/transfer 子節點)。
 *
 * 功能:
 *   - 狀態篩選 chip:全部 / 待處理 / 調撥中 / 已完成
 *   - IT 列表:單號、來源倉 → 本倉、明細、關聯 SO、狀態
 *   - 操作:
 *       pending    → [執行調撥] 呼叫 executeTransfer(IT 進 in_transit)
 *       in_transit → [完成入庫] 呼叫 completeTransfer(IT 進 completed,
 *                    若關聯 SO 所有供應條件達標則自動建 PK、SO 進 ready_to_pick)
 *       completed  → 顯示完成時間戳,無按鈕
 *
 * 庫存中心 PRO KPI / 其他作業頁等到 Phase 9~10。
 */

'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { useSalesStore } from '@/features/sale/ui/fulfillment/store';
import {
  IT_STATUS_LABEL,
  type IT,
  type ITStatus,
  type WarehouseKey,
} from '@/features/sale/ui/fulfillment/types';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | ITStatus;

interface FilterDef {
  id: FilterValue;
  label: string;
}

const FILTERS: readonly FilterDef[] = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待處理' },
  { id: 'in_transit', label: '調撥中' },
  { id: 'completed', label: '已完成' },
];

const WAREHOUSE_LABEL: Record<WarehouseKey, string> = {
  main: '本倉',
  hsinchu: '新竹倉',
  taichung: '台中倉',
};

const IT_TONE: Record<ITStatus, DocStatusTone> = {
  pending: 'warn',
  in_transit: 'info',
  completed: 'success',
  cancelled: 'muted',
};

function StatusBadge({ status }: { status: ITStatus }) {
  return <DocStatusBadge tone={IT_TONE[status]}>{IT_STATUS_LABEL[status]}</DocStatusBadge>;
}

function ITCard({
  it,
  onExecute,
  onComplete,
}: {
  it: IT;
  onExecute: () => void;
  onComplete: () => void;
}) {
  const fromLabel = Array.from(new Set(it.items.map((i) => WAREHOUSE_LABEL[i.fromWarehouse]))).join(
    ' / ',
  );
  const totalQty = it.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{it.itNumber}</span>
        <StatusBadge status={it.status} />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        <span className="text-white/80">
          {fromLabel} → {WAREHOUSE_LABEL[it.toWarehouse]}
        </span>
        <span className="ml-auto text-xs text-white/50 tabular-nums">共 {totalQty} 個</span>
      </div>

      <div className="space-y-1 border-t border-white/10 pt-2 text-xs text-white/70">
        {it.items.map((i, idx) => (
          <div key={`${i.sku}-${idx}`} className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-white/40">{i.sku}</span>
            <span className="min-w-0 flex-1 truncate">{i.name}</span>
            <span className="shrink-0 tabular-nums text-white/60">×{i.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="text-white/50">
          關聯 <span className="font-mono text-white/70">{it.relatedSoNumber}</span>
        </span>
        {it.status === 'pending' ? (
          <button
            type="button"
            onClick={onExecute}
            className="h-8 rounded border border-[#E8A020]/60 bg-[#E8A020]/5 px-3 text-xs text-[#E8A020] transition-colors hover:bg-[#E8A020]/10"
          >
            執行調撥
          </button>
        ) : it.status === 'in_transit' ? (
          <button
            type="button"
            onClick={onComplete}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90"
          >
            完成入庫
          </button>
        ) : it.status === 'completed' && it.completedAt ? (
          <span className="inline-flex items-center gap-1 text-white/50">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            完成於 {formatTimeAgo(it.completedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function formatTimeAgo(d: Date): string {
  const diff = Math.max(0, Date.now() - d.getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

export function MobileTransferListPage() {
  const its = useSalesStore((s) => s.its);
  const executeTransfer = useSalesStore((s) => s.executeTransfer);
  const completeTransfer = useSalesStore((s) => s.completeTransfer);

  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered = useMemo(() => {
    const sorted = [...its].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (filter === 'all') return sorted;
    return sorted.filter((it) => it.status === filter);
  }, [its, filter]);

  const pendingCount = its.filter((it) => it.status !== 'completed' && it.status !== 'cancelled')
    .length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 調撥清單</h1>
        <p className="text-xs text-white/50">他倉 → 本倉調撥任務,完成後自動建立撿貨單</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cx(
                'inline-flex h-8 items-center rounded-full border px-3 text-xs transition-colors',
                isActive
                  ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-white/50 tabular-nums">
        共 {filtered.length} 筆 · 尚待處理 {pendingCount} 筆
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的調撥單
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <ITCard
              key={it.id}
              it={it}
              onExecute={() => executeTransfer(it.id)}
              onComplete={() => completeTransfer(it.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
