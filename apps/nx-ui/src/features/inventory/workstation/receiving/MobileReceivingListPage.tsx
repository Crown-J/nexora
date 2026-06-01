// apps/nx-ui/src/features/inventory/workstation/receiving/MobileReceivingListPage.tsx
// 庫存中心 · 驗收清單（手機版、新做）
//
// v1.2 階段 G P5：取代既有 PlaceholderPage、Q4=a 接 nx03/inbound GRN
// 業務語意（總經理拍板）：「驗收 = 貨到現場清點」、接實體收貨流程比票據流程貼近
//
// 狀態流（InboundStatus）：
//   DRAFT → INSPECTING → POSTED / REJECTED / CANCELLED
//   完成驗收 = sequential PATCH DRAFT→INSPECTING→POSTED（觸發後端 applyInboundPosting 入庫）
//
// 範式：
// - 列表卡片：docNo / inboundDate / status / 行數
// - 點卡 → 進入詳情頁（line items + 掃條碼確認）
// - 詳情頁完成驗收按鈕觸發 POSTED

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cx } from '@/shared/lib/cx';

import {
  listInbounds,
  type Inbound,
  type InboundStatus,
} from '@/features/inventory/workstation/api';

import { DocStatusBadge, type DocStatusTone } from '../shared/DocStatusBadge';

type FilterValue = 'all' | InboundStatus;

const FILTERS: ReadonlyArray<{ id: FilterValue; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'DRAFT', label: '待驗收' },
  { id: 'INSPECTING', label: '驗收中' },
  { id: 'POSTED', label: '已入庫' },
];

const STATUS_LABEL: Record<InboundStatus, string> = {
  DRAFT: '待驗收',
  INSPECTING: '驗收中',
  POSTED: '已入庫',
  REJECTED: '已拒收',
  CANCELLED: '已取消',
};

const STATUS_TONE: Record<InboundStatus, DocStatusTone> = {
  DRAFT: 'warn',
  INSPECTING: 'info',
  POSTED: 'success',
  REJECTED: 'muted',
  CANCELLED: 'muted',
};

function InboundCard({ inb, onOpen }: { inb: Inbound; onOpen: () => void }) {
  const isClosed = inb.status === 'POSTED' || inb.status === 'REJECTED' || inb.status === 'CANCELLED';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full space-y-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-[#E8A020]/40 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-white/80">{inb.docNo}</span>
        <DocStatusBadge tone={STATUS_TONE[inb.status]}>{STATUS_LABEL[inb.status]}</DocStatusBadge>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-xs text-white/60">
        <span className="font-mono">{inb.inboundDate.slice(0, 10)}</span>
        {inb.postedAt ? (
          <>
            <span className="text-white/30">·</span>
            <span>入庫 {new Date(inb.postedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
          </>
        ) : null}
      </div>

      {inb.remark ? (
        <div className="text-xs text-white/50 truncate">{inb.remark}</div>
      ) : null}

      {!isClosed ? (
        <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
          <span className="text-white/40">點卡進入掃條碼模式</span>
          <span className="text-[#E8A020]">→</span>
        </div>
      ) : null}
    </button>
  );
}

export function MobileReceivingListPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [inbs, setInbs] = useState<Inbound[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInbounds({
        pageSize: 50,
        status: filter === 'all' ? undefined : filter,
      });
      setInbs(res.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () => [...inbs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [inbs],
  );

  const pendingCount = inbs.filter((i) => i.status === 'DRAFT' || i.status === 'INSPECTING').length;

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg text-white">
            <ClipboardCheck className="size-5 text-[#E8A020]" /> 庫存中心 · 驗收清單
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
          GRN 驗收：點卡進入掃條碼模式、完成後自動入庫
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
        共 {sorted.length} 筆 · 待驗收 {pendingCount} 筆
      </div>

      {loading && sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          載入中…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          目前沒有符合篩選條件的驗收單
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((inb) => (
            <InboundCard
              key={inb.id}
              inb={inb}
              onOpen={() => router.push(`/dashboard/inventory/receiving/${inb.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
