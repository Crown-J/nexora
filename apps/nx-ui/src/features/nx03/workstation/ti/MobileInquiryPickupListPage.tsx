// apps/nx-ui/src/features/nx03/workstation/ti/MobileInquiryPickupListPage.tsx
/**
 * 庫存中心 · 同行調貨取貨清單（手機版）。
 *
 * 入口：/dashboard/inventory/ti。
 * MOCK-CLEAN 2026-07-19：棄 useSalesStore mock、接真 /nx02/ti（listTi）。
 *
 * 語意（對齊 TI 真狀態機、原 mock「取貨/完成」兩鍵改真流程導引）：
 *   DRAFT/SENT/REPLIED＝待取貨（外務去同行拿貨的任務清單）
 *   PENDING_RECEIPT ＝已轉進貨、待驗收（驗收工作站過帳後自動完成）
 *   COMPLETED       ＝已完成（RR 過帳回寫、銷貨缺貨行同步解鎖）
 * 「轉進貨驗收」需選倉＋逐項儲位 → 動作在桌機 TI 單據；本頁為外務行動清單（唯讀＋重整）。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Store } from 'lucide-react';

import { listTi } from '@data/endpoints/nx02/ti/api/ti';
import type { Ti } from '@data/types/nx02/ti';
import { cx } from '@design/utils/cx';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | 'pickup' | 'PENDING_RECEIPT' | 'COMPLETED';

const FILTERS: readonly { id: FilterValue; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'pickup', label: '待取貨' },
  { id: 'PENDING_RECEIPT', label: '待驗收' },
  { id: 'COMPLETED', label: '已完成' },
];

const PICKUP_SET = new Set(['DRAFT', 'SENT', 'REPLIED']);

const TI_TONE: Record<string, DocStatusTone> = {
  DRAFT: 'warn',
  SENT: 'warn',
  REPLIED: 'warn',
  PENDING_RECEIPT: 'info',
  COMPLETED: 'success',
  CANCELLED: 'muted',
};
const TI_LABEL: Record<string, string> = {
  DRAFT: '待取貨',
  SENT: '待取貨（已通知）',
  REPLIED: '待取貨（已回覆）',
  PENDING_RECEIPT: '待驗收',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const money = (v: number | string) => `$${Number(v).toLocaleString('zh-TW')}`;

function TiCard({ ti }: { ti: Ti }) {
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{ti.docNo}</span>
        <DocStatusBadge tone={TI_TONE[ti.status] ?? 'muted'}>{TI_LABEL[ti.status] ?? ti.status}</DocStatusBadge>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Store className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-white/80">
          {ti.partnerCode}　{ti.partnerName}
        </span>
        <span className="shrink-0 text-xs text-white/50 tabular-nums">{ti.itemCount ?? 0} 項</span>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="text-white/50">
          {ti.tiDate?.slice(0, 10)}・入 {ti.warehouseCode ?? ''} 倉
        </span>
        <span className="tabular-nums text-white/70">{money(ti.totalAmount)}</span>
      </div>

      {PICKUP_SET.has(ti.status) ? (
        <div className="border-t border-white/10 pt-2 text-[11px] text-white/45">
          取回後至桌機「同行調貨單」轉進貨驗收（選倉＋儲位）
        </div>
      ) : ti.status === 'PENDING_RECEIPT' ? (
        <div className="border-t border-white/10 pt-2 text-[11px] text-white/45">
          已轉進貨——驗收工作站過帳後自動完成、銷貨缺貨行同步解鎖
        </div>
      ) : null}
    </div>
  );
}

export function MobileInquiryPickupListPage() {
  const [rows, setRows] = useState<Ti[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await listTi({ page: 1, pageSize: 50 });
      setRows(r.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '調貨清單載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const alive = rows.filter((r) => r.status !== 'CANCELLED');
    if (filter === 'all') return alive;
    if (filter === 'pickup') return alive.filter((r) => PICKUP_SET.has(r.status));
    return alive.filter((r) => r.status === filter);
  }, [rows, filter]);
  const pickupCount = rows.filter((r) => PICKUP_SET.has(r.status)).length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-lg text-white">庫存中心 · 同行調貨取貨</h1>
          <p className="text-xs text-white/50">向同行取貨的任務清單；驗收過帳後自動結案</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="重新整理"
          className="rounded-lg border border-white/10 p-2 text-white/60 hover:border-white/20"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
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
        共 {filtered.length} 筆 · 待取貨 {pickupCount} 筆
      </div>

      {err ? (
        <div className="rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-xs text-red-300">{err}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          載入中…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的調貨單
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ti) => (
            <TiCard key={ti.id} ti={ti} />
          ))}
        </div>
      )}
    </div>
  );
}
