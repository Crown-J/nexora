// apps/nx-ui/src/features/inventory/workstation/picking/MobilePickingListPage.tsx
// 庫存中心 · 撿貨清單（手機版）
//
// v1.2 階段 G P2：棄 useSalesStore mock、接真實 nx03/pk API
// 對齊 audit §10「撿貨工作站、FU-stock-lite-03 揭露用 mock data、未接真實 API」修補
//
// 範式：
// - 4 篩選 chip：全部 / 待撿 (P) / 撿貨中 (C) / 已完成 (F)
// - 卡片：docNo / pkDate / triggerSource / 數量 + 動作按鈕
// - 「完成撿貨」按鈕 = sequential PATCH P→C→F（state machine 不允許 P→F 直跳）
// - 逐項掃條碼 + 庫位指引留給 P6 盤點軌共用（本軌只做列表+一鍵完成）

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { cx } from '@design/utils/cx';

import {
  completePicking,
  listPks,
  type Pk,
  type PkStatus,
} from '@data/endpoints/nx03/workstation/api';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | PkStatus;

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'P', label: '待撿貨' },
  { id: 'C', label: '撿貨中' },
  { id: 'F', label: '已完成' },
];

const PK_STATUS_LABEL: Record<PkStatus, string> = {
  P: '待撿貨',
  C: '撿貨中',
  F: '已完成',
  V: '作廢',
};

const PK_TONE: Record<PkStatus, DocStatusTone> = {
  P: 'warn',
  C: 'info',
  F: 'success',
  V: 'muted',
};

const TRIGGER_LABEL: Record<'S' | 'T', string> = {
  S: '銷貨',
  T: '調撥',
};

function PKCard({ pk, busy, onComplete }: { pk: Pk; busy: boolean; onComplete: () => void }) {
  const isDone = pk.status === 'F' || pk.status === 'V';
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{pk.docNo}</span>
        <DocStatusBadge tone={PK_TONE[pk.status]}>{PK_STATUS_LABEL[pk.status]}</DocStatusBadge>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-xs text-white/60">
        <span>{TRIGGER_LABEL[pk.triggerSource]}</span>
        <span className="text-white/30">·</span>
        <span className="font-mono">{pk.pkDate.slice(0, 10)}</span>
        {pk.pickupCode ? (
          <>
            <span className="text-white/30">·</span>
            <span className="font-mono text-[#E8A020]">{pk.pickupCode}</span>
          </>
        ) : null}
      </div>

      {pk.remark ? (
        <div className="text-xs text-white/50 truncate">{pk.remark}</div>
      ) : null}

      {!isDone ? (
        <div className="flex justify-end border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={onComplete}
            disabled={busy}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '處理中…' : '完成撿貨'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MobilePickingListPage() {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [pks, setPks] = useState<Pk[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPks({
        pageSize: 50,
        status: filter === 'all' ? undefined : filter,
      });
      setPks(res.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleComplete = useCallback(
    async (pk: Pk) => {
      setBusyId(pk.id);
      setError(null);
      try {
        await completePicking(pk.id, pk.status);
        await load();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const sorted = useMemo(
    () => [...pks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [pks],
  );

  const pendingCount = pks.filter((pk) => pk.status === 'P' || pk.status === 'C').length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-lg text-white">庫存中心 · 撿貨清單</h1>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="重新整理"
            className="inline-flex h-8 items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 text-xs text-white/70 hover:border-white/20 disabled:opacity-50"
          >
            <RefreshCw className={cx('size-3.5', loading && 'animate-spin')} />
          </button>
        </div>
        <p className="text-xs text-white/50">P→C→F 三狀態流、完成撿貨後可進入包貨工作站</p>
      </header>

      {error ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
          {error}
        </div>
      ) : null}

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
        共 {sorted.length} 筆 · 待處理 {pendingCount} 筆
      </div>

      {loading && sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          載入中…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的撿貨單
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((pk) => (
            <PKCard
              key={pk.id}
              pk={pk}
              busy={busyId === pk.id}
              onComplete={() => void handleComplete(pk)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
