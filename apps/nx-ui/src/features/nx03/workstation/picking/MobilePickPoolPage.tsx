// apps/nx-ui/src/features/nx03/workstation/picking/MobilePickPoolPage.tsx
/**
 * 庫存中心 · 撿貨池（手機/平板優先、SALES-FLOW 階段 1）。
 *
 * 業務語意（2026-07-22 執行長拍板 D1）：撿貨「表頭拆掉」＝一張工作池清單、不新增撿貨單。
 *   要出貨的現貨行自動進池；倉管在手機上依 SO 群組作業：開始撿 → 逐行撿到/找不到。
 *   撿完的行餵往包貨（階段 2）。此頁不扣帳（扣庫存/開應收依 D4/D6 移到簽收）。
 *
 * 池行狀態：W 待撿 → K 撿貨中 → D 已撿完／M 找不到。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, PackageSearch, PlayCircle, RefreshCw, Search, XCircle } from 'lucide-react';

import {
  getPickPool,
  notFoundPoolLine,
  pickPoolLine,
  startPick,
  type PoolGroup,
  type PoolLine,
  type PoolLineStatus,
} from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

type FilterValue = 'all' | PoolLineStatus;

const FILTERS: readonly { id: FilterValue; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'W', label: '待撿' },
  { id: 'K', label: '撿貨中' },
  { id: 'D', label: '已撿完' },
];

const DELIVERY_LABEL: Record<string, string> = { D: '配送', P: '自取', C: '寄貨', T: '調撥' };

const LINE_TONE: Record<PoolLineStatus, string> = {
  W: 'border-border bg-card text-muted-foreground',
  K: 'border-primary/40 bg-primary/5 text-primary',
  D: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
  M: 'border-destructive/40 bg-destructive/10 text-destructive',
};
const LINE_LABEL: Record<PoolLineStatus, string> = { W: '待撿', K: '撿貨中', D: '已撿完', M: '找不到' };

function LineRow({
  line,
  busy,
  onPick,
  onNotFound,
}: {
  line: PoolLine;
  busy: boolean;
  onPick: () => void;
  onNotFound: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border/60 py-2.5 first:border-t-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-mono text-xs text-foreground">{line.partNo}</p>
          <p className="truncate text-xs text-muted-foreground">{line.partName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="font-mono text-sm text-foreground tabular-nums">×{line.qty}</span>
          <span className={cx('mt-1 rounded px-1.5 py-0.5 text-[10px]', LINE_TONE[line.status])}>
            {LINE_LABEL[line.status]}
          </span>
        </div>
      </div>
      {line.status === 'K' ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onPick}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 text-xs font-medium text-white transition-colors hover:bg-emerald-600/90 disabled:opacity-40"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            撿到了
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onNotFound}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-destructive/40 px-3 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
          >
            <XCircle className="h-4 w-4" aria-hidden />
            找不到
          </button>
        </div>
      ) : null}
    </div>
  );
}

function GroupCard({
  group,
  busy,
  onStart,
  onPick,
  onNotFound,
}: {
  group: PoolGroup;
  busy: boolean;
  onStart: () => void;
  onPick: (soItemId: string) => void;
  onNotFound: (line: PoolLine) => void;
}) {
  const hasPending = group.pendingCount > 0;
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <span className="font-mono text-sm text-foreground">{group.soDocNo}</span>
          <p className="truncate text-xs text-muted-foreground">{group.customerName}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
          {DELIVERY_LABEL[group.deliveryType] ?? group.deliveryType} · {group.warehouseCode}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
        <span>待撿 {group.pendingCount}</span>
        <span className="text-primary/80">撿貨中 {group.pickingCount}</span>
        <span className="text-emerald-600">已撿完 {group.doneCount}</span>
      </div>

      <div className="rounded-lg bg-muted/40 px-2">
        {group.lines.map((line) => (
          <LineRow
            key={line.soItemId}
            line={line}
            busy={busy}
            onPick={() => onPick(line.soItemId)}
            onNotFound={() => onNotFound(line)}
          />
        ))}
      </div>

      {hasPending ? (
        <button
          type="button"
          disabled={busy}
          onClick={onStart}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-primary/5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
        >
          <PlayCircle className="h-4 w-4" aria-hidden />
          開始撿貨（{group.pendingCount} 行待撿）
        </button>
      ) : null}
    </div>
  );
}

export function MobilePickPoolPage() {
  const [groups, setGroups] = useState<PoolGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await getPickPool({
        status: filter === 'all' ? undefined : filter,
        search: search.trim() || undefined,
      });
      setGroups(r.groups);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '撿貨池載入失敗');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (fn: () => Promise<unknown>, fallbackMsg: string) => {
      setBusy(true);
      setErr(null);
      try {
        await fn();
        await load();
      } catch (e) {
        setErr(e instanceof Error ? e.message : fallbackMsg);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const handleStart = (soId: string) => void runAction(() => startPick(soId), '開始撿貨失敗');
  const handlePick = (soItemId: string) => void runAction(() => pickPoolLine(soItemId), '標記撿到失敗');
  const handleNotFound = (line: PoolLine) => {
    const reason = window.prompt(`「${line.partNo}」找不到貨，請填原因：`);
    if (!reason?.trim()) return;
    void runAction(() => notFoundPoolLine(line.soItemId, reason.trim()), '標記找不到失敗');
  };

  const totalLines = useMemo(() => groups.reduce((n, g) => n + g.lines.length, 0), [groups]);
  const pickingLines = useMemo(() => groups.reduce((n, g) => n + g.pickingCount, 0), [groups]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-lg text-foreground">
            <PackageSearch className="h-5 w-5 text-primary" aria-hidden />
            庫存中心 · 撿貨池
          </h1>
          <p className="text-xs text-muted-foreground">要出貨的現貨自動進池；開始撿 → 逐行點撿到／找不到</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="重新整理"
          className="rounded-lg border border-border p-2 text-muted-foreground hover:border-border"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋 銷貨單號 / 客戶 / 料號"
          className="h-10 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

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
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-border',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground tabular-nums">
        {groups.length} 張單 · 共 {totalLines} 行 · 撿貨中 {pickingLines} 行
      </div>

      {err ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{err}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          載入中…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          目前撿貨池沒有待撿的貨
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <GroupCard
              key={g.soId}
              group={g}
              busy={busy}
              onStart={() => handleStart(g.soId)}
              onPick={handlePick}
              onNotFound={handleNotFound}
            />
          ))}
        </div>
      )}
    </div>
  );
}
