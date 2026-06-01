// apps/nx-ui/src/features/inventory/workstation/delivery/MobileDeliveryListPage.tsx
// 庫存中心 · 配送清單(DN、手機版基本版)
//
// v1.2 階段 G P4：棄 useSalesStore mock、接真實 nx06/delivery API
// ⚠️ 範圍重申（總經理拍板移下階段）：
//   ❌ 不含 Google Map 路線規劃
//   ❌ 不含 Lalamove 第三方串接
//   ❌ 不含配送地圖顯示
//   ✅ 只做：清單 + 狀態更新（出發 / 抵達 / 失敗）
//
// 狀態流（nx06 DELIVERY edges）：
//   DRAFT → DISPATCHED → DELIVERED / FAILED / VOIDED
//
// 按鈕語意：
//   DRAFT      → 「派車出發」(→ DISPATCHED)
//   DISPATCHED → 「客戶簽收」(→ DELIVERED) / 「送貨失敗」(→ FAILED)

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, Truck } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { listDns, patchDn, type Dn, type DnStatus } from '@/features/inventory/workstation/api';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | DnStatus;

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'DRAFT', label: '待派' },
  { id: 'DISPATCHED', label: '配送中' },
  { id: 'DELIVERED', label: '已送達' },
];

const DN_STATUS_LABEL: Record<DnStatus, string> = {
  DRAFT: '待派',
  DISPATCHED: '配送中',
  DELIVERED: '已送達',
  FAILED: '送貨失敗',
  VOIDED: '作廢',
};

const DN_TONE: Record<DnStatus, DocStatusTone> = {
  DRAFT: 'warn',
  DISPATCHED: 'info',
  DELIVERED: 'success',
  FAILED: 'muted',
  VOIDED: 'muted',
};

function DNCard({
  dn,
  busy,
  onDispatch,
  onDeliver,
  onFail,
}: {
  dn: Dn;
  busy: boolean;
  onDispatch: () => void;
  onDeliver: () => void;
  onFail: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{dn.docNo}</span>
        <DocStatusBadge tone={DN_TONE[dn.status]}>{DN_STATUS_LABEL[dn.status]}</DocStatusBadge>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2 text-xs text-white/60">
        <span className="font-mono">{dn.dnDate.slice(0, 10)}</span>
        {dn.vehicleNo ? (
          <>
            <span className="text-white/30">·</span>
            <span className="flex items-center gap-1">
              <Truck className="size-3" />
              {dn.vehicleNo}
            </span>
          </>
        ) : null}
        {dn.dispatchedAt ? (
          <>
            <span className="text-white/30">·</span>
            <span>出發 {new Date(dn.dispatchedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
          </>
        ) : null}
        {dn.deliveredAt ? (
          <>
            <span className="text-white/30">·</span>
            <span>送達 {new Date(dn.deliveredAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
          </>
        ) : null}
      </div>

      {dn.remark ? (
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <Building2 className="size-3 text-white/30" />
          <span className="truncate">{dn.remark}</span>
        </div>
      ) : null}

      {dn.status === 'DRAFT' ? (
        <div className="flex justify-end border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={onDispatch}
            disabled={busy}
            className="h-8 rounded bg-[#E8A020] px-3 text-xs text-black transition-colors hover:bg-[#E8A020]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '處理中…' : '派車出發'}
          </button>
        </div>
      ) : dn.status === 'DISPATCHED' ? (
        <div className="flex justify-end gap-2 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={onFail}
            disabled={busy}
            className="h-8 rounded border border-[#E26060]/40 px-3 text-xs text-[#E26060] transition-colors hover:bg-[#E26060]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            送貨失敗
          </button>
          <button
            type="button"
            onClick={onDeliver}
            disabled={busy}
            className="h-8 rounded bg-[#1D9E75] px-3 text-xs text-black transition-colors hover:bg-[#1D9E75]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '處理中…' : '客戶簽收'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MobileDeliveryListPage() {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [dns, setDns] = useState<Dn[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDns({
        pageSize: 50,
        status: filter === 'all' ? undefined : filter,
      });
      setDns(res.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePatch = useCallback(
    async (dn: Dn, nextStatus: DnStatus) => {
      setBusyId(dn.id);
      setError(null);
      try {
        await patchDn(dn.id, { status: nextStatus });
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
    () => [...dns].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [dns],
  );

  const activeCount = dns.filter((dn) => dn.status === 'DRAFT' || dn.status === 'DISPATCHED').length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg text-white">
            <Truck className="size-5 text-[#E8A020]" /> 庫存中心 · 配送清單
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
          基本版：清單 + 狀態更新（地圖路線 / 第三方物流移下階段）
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
        共 {sorted.length} 筆 · 在途 {activeCount} 筆
      </div>

      {loading && sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          載入中…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的配送單
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((dn) => (
            <DNCard
              key={dn.id}
              dn={dn}
              busy={busyId === dn.id}
              onDispatch={() => void handlePatch(dn, 'DISPATCHED')}
              onDeliver={() => void handlePatch(dn, 'DELIVERED')}
              onFail={() => void handlePatch(dn, 'FAILED')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
