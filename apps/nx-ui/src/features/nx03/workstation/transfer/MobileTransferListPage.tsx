// apps/nx-ui/src/features/nx03/workstation/transfer/MobileTransferListPage.tsx
/**
 * 庫存中心 · 調撥清單（手機版、窄螢幕分流）。
 *
 * 入口：/dashboard/inventory/transfer（TransferRouteSwitch 窄螢幕分流）。
 * MOCK-CLEAN 2026-07-19：棄 useSalesStore mock、接真 /nx03/transfer（listSt/updateSt）。
 *
 * 狀態流（對齊桌機 StDetailView）：DRAFT 草稿 →［執行調撥出庫］→ TRANSIT 調撥中
 *   →［收貨過帳］→ RECEIVED（動庫存；SO 缺貨觸發的調撥會自動解鎖銷貨行）。
 * 收貨過帳需明細儲位齊全——缺儲位後端會擋、顯示錯誤並請至桌機版補。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, RefreshCw } from 'lucide-react';

import { listSt, updateSt } from '@data/endpoints/nx03/transfer/api/transfer';
import type { St } from '@data/types/nx03/transfer';
import { cx } from '@design/utils/cx';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | 'DRAFT' | 'TRANSIT' | 'RECEIVED';

const FILTERS: readonly { id: FilterValue; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'DRAFT', label: '待出庫' },
  { id: 'TRANSIT', label: '調撥中' },
  { id: 'RECEIVED', label: '已完成' },
];

const ST_TONE: Record<string, DocStatusTone> = {
  DRAFT: 'warn',
  TRANSIT: 'info',
  RECEIVED: 'success',
  CANCELLED: 'muted',
};
const ST_LABEL: Record<string, string> = {
  DRAFT: '待出庫',
  TRANSIT: '調撥中',
  RECEIVED: '已收貨',
  CANCELLED: '已作廢',
};

function StCard({
  row,
  busy,
  onAdvance,
}: {
  row: St;
  busy: boolean;
  onAdvance: (to: 'TRANSIT' | 'RECEIVED') => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{row.docNo}</span>
        <DocStatusBadge tone={ST_TONE[row.status] ?? 'muted'}>{ST_LABEL[row.status] ?? row.status}</DocStatusBadge>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        <span className="text-white/80">
          {row.fromWarehouseName} → {row.toWarehouseName}
        </span>
        <span className="ml-auto text-xs text-white/50 tabular-nums">{row.items?.length ?? 0} 項</span>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="text-white/50">{row.stDate?.slice(0, 10)}</span>
        {row.status === 'DRAFT' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance('TRANSIT')}
            className="h-8 rounded border border-[#E8A020]/60 bg-[#E8A020]/5 px-3 text-xs text-[#E8A020] transition-colors hover:bg-[#E8A020]/10 disabled:opacity-40"
          >
            執行調撥出庫
          </button>
        ) : row.status === 'TRANSIT' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance('RECEIVED')}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90 disabled:opacity-40"
          >
            收貨過帳
          </button>
        ) : row.status === 'RECEIVED' ? (
          <span className="inline-flex items-center gap-1 text-white/50">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            已入庫
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function MobileTransferListPage() {
  const [rows, setRows] = useState<St[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await listSt({ page: 1, pageSize: 50 });
      setRows(r.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '調撥清單載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const advance = async (id: string, to: 'TRANSIT' | 'RECEIVED') => {
    setBusyId(id);
    setErr(null);
    try {
      await updateSt(id, { status: to });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '狀態更新失敗';
      // 收貨過帳最常見擋單：明細儲位未填（自動調撥單建立時無儲位）
      setErr(to === 'RECEIVED' && /location/i.test(msg) ? '收貨過帳需先補明細儲位——請至桌機版調撥單填入後再過帳' : msg);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(
    () => (filter === 'all' ? rows.filter((r) => r.status !== 'CANCELLED') : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  const pendingCount = rows.filter((r) => r.status === 'DRAFT' || r.status === 'TRANSIT').length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-lg text-white">庫存中心 · 調撥清單</h1>
          <p className="text-xs text-white/50">他倉 → 本倉調撥任務；收貨過帳後銷貨缺貨行自動解鎖</p>
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
        共 {filtered.length} 筆 · 進行中 {pendingCount} 筆
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
          目前沒有符合篩選條件的調撥單
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <StCard key={row.id} row={row} busy={busyId === row.id} onAdvance={(to) => void advance(row.id, to)} />
          ))}
        </div>
      )}
    </div>
  );
}
