// apps/nx-ui/src/features/inventory/workstation/packing/MobilePackingListPage.tsx
// 庫存中心 · 包貨清單（手機版）
//
// v1.2 階段 G P3：棄 useSalesStore mock、接真實 nx03/pl + nx03/parcel API
// 對齊 audit §10「包貨工作站、包裹編號生成機制未見」修補
//
// 範式：
// - 4 篩選 chip：全部 / 待包 (P) / 包貨中 (C) / 已完成 (F)
// - 卡片：docNo / plDate / plType / 來源 pk / 動作按鈕
// - 「完成包貨」按鈕 = sequential PATCH P→C→F + POST /nx03/parcel
//   · 完成後立刻顯示包裹編號 BX-YYYYMM-倉碼-NNNNN（blueprint §10.3）
// - 包裹編號用後端 allocParcelNo 自動生（不前端 derive）

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CheckCircle2, RefreshCw } from 'lucide-react';

import { cx } from '@design/utils/cx';

import {
  completePackingAndCreateParcel,
  listPls,
  type Pl,
  type PlStatus,
} from '@data/endpoints/nx03/workstation/api';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | PlStatus;

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'P', label: '待包貨' },
  { id: 'C', label: '包貨中' },
  { id: 'F', label: '已完成' },
];

const PL_STATUS_LABEL: Record<PlStatus, string> = {
  P: '待包貨',
  C: '包貨中',
  F: '已完成',
  S: '已寄出',
  V: '作廢',
};

const PL_TONE: Record<PlStatus, DocStatusTone> = {
  P: 'warn',
  C: 'info',
  F: 'success',
  S: 'success',
  V: 'muted',
};

const PL_TYPE_LABEL: Record<'D' | 'P' | 'C' | 'T', string> = {
  D: '配送',
  P: '自取',
  C: '寄貨',
  T: '調撥',
};

function PLCard({
  pl,
  busy,
  parcelNo,
  onComplete,
}: {
  pl: Pl;
  busy: boolean;
  parcelNo: string | null;
  onComplete: () => void;
}) {
  const isDone = pl.status === 'F' || pl.status === 'S' || pl.status === 'V';
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{pl.docNo}</span>
        <DocStatusBadge tone={PL_TONE[pl.status]}>{PL_STATUS_LABEL[pl.status]}</DocStatusBadge>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-xs text-white/60">
        <span>{PL_TYPE_LABEL[pl.plType]}</span>
        <span className="text-white/30">·</span>
        <span className="font-mono">{pl.plDate.slice(0, 10)}</span>
        {pl.pkNo ? (
          <>
            <span className="text-white/30">·</span>
            <span className="font-mono text-white/40">來源 {pl.pkNo}</span>
          </>
        ) : null}
      </div>

      {parcelNo ? (
        <div className="flex items-center gap-2 rounded border border-[#1D9E75]/40 bg-[#1D9E75]/10 px-2 py-1.5 text-xs">
          <CheckCircle2 className="size-4 text-[#1D9E75]" />
          <span className="text-white/80">包裹編號已產生：</span>
          <span className="font-mono text-[#1D9E75]">{parcelNo}</span>
        </div>
      ) : null}

      {pl.remark ? (
        <div className="text-xs text-white/50 truncate">{pl.remark}</div>
      ) : null}

      {!isDone ? (
        <div className="flex justify-end border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={onComplete}
            disabled={busy}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '處理中…' : '完成包貨並生編號'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MobilePackingListPage() {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [pls, setPls] = useState<Pl[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 完成包貨剛產生的包裹編號（顯示在對應 card 上） */
  const [recentParcels, setRecentParcels] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPls({
        pageSize: 50,
        status: filter === 'all' ? undefined : filter,
      });
      setPls(res.items);
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
    async (pl: Pl) => {
      setBusyId(pl.id);
      setError(null);
      try {
        const { parcel } = await completePackingAndCreateParcel(pl.id, pl.status, pl.plType);
        setRecentParcels((prev) => ({ ...prev, [pl.id]: parcel.parcelNo }));
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
    () => [...pls].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [pls],
  );

  const pendingCount = pls.filter((pl) => pl.status === 'P' || pl.status === 'C').length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg text-white">
            <Box className="size-5 text-[#E8A020]" /> 庫存中心 · 包貨清單
          </h1>
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
        <p className="text-xs text-white/50">
          完成包貨自動產生包裹編號 <span className="font-mono text-[#E8A020]">BX-YYYYMM-倉碼-NNNNN</span>
        </p>
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
          目前沒有符合篩選條件的包貨單
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((pl) => (
            <PLCard
              key={pl.id}
              pl={pl}
              busy={busyId === pl.id}
              parcelNo={recentParcels[pl.id] ?? null}
              onComplete={() => void handleComplete(pl)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
