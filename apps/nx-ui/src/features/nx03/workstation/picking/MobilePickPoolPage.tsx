// apps/nx-ui/src/features/nx03/workstation/picking/MobilePickPoolPage.tsx
/**
 * 庫存中心 · 撿貨清單（手機/平板優先、SALES-FLOW 撿貨重設計 2026-07-22）。
 *
 * 庫位軸（執行長拍板）：撿貨不看銷貨單，看庫位。清單依庫位分組、同（倉×料件）合併總量，
 *   照庫位順路一路撿到包貨區。每列快速反應四件事：
 *   1 這東西在哪（庫位大字）2 長什麼樣（主圖）3 異常（開異常回報單）4 撿好了。
 *
 * 撿貨不扣帳（扣庫存/開應收依 D4/D6 移到簽收）。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImageOff, MapPin, PackageSearch, RefreshCw, Search } from 'lucide-react';

import { partPhotoUrl } from '@data/endpoints/shared/part-photo/part-photo-api';
import {
  getPickList,
  pickAggregate,
  reportPickIssue,
  type PickGroup,
  type PickItem,
} from '@data/endpoints/nx03/workstation/api';

function PartThumb({ partId, photoId }: { partId: string; photoId: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!photoId || failed) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
        <ImageOff className="h-5 w-5" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={partPhotoUrl(partId, photoId)}
      alt=""
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
    />
  );
}

function ItemRow({
  item,
  busy,
  onPick,
  onIssue,
}: {
  item: PickItem;
  busy: boolean;
  onPick: () => void;
  onIssue: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border/60 py-2.5 first:border-t-0">
      <PartThumb partId={item.partId} photoId={item.photoId} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-mono text-xs text-foreground">{item.partNo}</p>
        <p className="truncate text-xs text-muted-foreground">{item.partName}</p>
        <p className="text-sm font-semibold text-foreground tabular-nums">
          撿 <span className="text-base text-primary">×{item.totalQty}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={onPick}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition-colors hover:bg-emerald-600/90 disabled:opacity-40"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          撿到了
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onIssue}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-amber-500/50 px-3 text-xs text-amber-600 transition-colors hover:bg-amber-500/10 disabled:opacity-40"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          異常
        </button>
      </div>
    </div>
  );
}

function IssueDialog({
  item,
  busy,
  onCancel,
  onSubmit,
}: {
  item: PickItem;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (issueType: 'D' | 'S', qty: number, reason: string) => void;
}) {
  const [issueType, setIssueType] = useState<'D' | 'S'>('S');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
        <div>
          <h2 className="text-base font-semibold text-foreground">撿貨異常回報</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.partNo} · {item.partName}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['S', 'D'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setIssueType(t)}
              className={
                'h-10 rounded-lg border text-sm transition-colors ' +
                (issueType === t
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-600'
                  : 'border-border text-muted-foreground hover:border-border')
              }
            >
              {t === 'S' ? '數量不對（短缺）' : '東西損毀'}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-xs text-muted-foreground">異常數量</span>
          <input
            type="number"
            min="0"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-foreground focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">說明（選填）</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="例：外盒破損、實際只有 3 個"
            className="mt-1 h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground">
            取消
          </button>
          <button
            type="button"
            disabled={busy || !(Number(qty) > 0)}
            onClick={() => onSubmit(issueType, Number(qty), reason.trim())}
            className="h-9 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-600/90 disabled:opacity-40"
          >
            開異常單
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobilePickPoolPage() {
  const [groups, setGroups] = useState<PickGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [issueTarget, setIssueTarget] = useState<PickItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await getPickList({ search: search.trim() || undefined });
      setGroups(r.groups);
      setTotal(r.total);
      setLineCount(r.lineCount);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '撿貨清單載入失敗');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (fn: () => Promise<unknown>, okMsg: string, fallback: string) => {
      setBusy(true);
      setErr(null);
      setMsg(null);
      try {
        await fn();
        setMsg(okMsg);
        await load();
      } catch (e) {
        setErr(e instanceof Error ? e.message : fallback);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const handlePick = (item: PickItem) =>
    void run(() => pickAggregate(item.warehouseId, item.partId), `已撿：${item.partNo}`, '撿貨失敗');

  const handleIssue = (issueType: 'D' | 'S', qty: number, reason: string) => {
    const item = issueTarget;
    if (!item) return;
    setIssueTarget(null);
    void run(
      () => reportPickIssue({ warehouseId: item.warehouseId, partId: item.partId, issueType, qty, reason }),
      `已開異常單：${item.partNo}`,
      '異常回報失敗',
    );
  };

  const groupCount = useMemo(() => groups.length, [groups]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-lg text-foreground">
            <PackageSearch className="h-5 w-5 text-primary" aria-hidden />
            庫存中心 · 撿貨清單
          </h1>
          <p className="text-xs text-muted-foreground">依庫位順路撿；一格拿齊、點「撿到了」；有問題點「異常」</p>
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
          placeholder="搜尋 料號 / 品名"
          className="h-10 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div className="text-xs text-muted-foreground tabular-nums">
        {groupCount} 個庫位 · {total} 項待撿 · {lineCount} 筆需求
      </div>

      {err ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{err}</div>
      ) : null}
      {msg ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-600">{msg}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          載入中…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          目前沒有待撿的貨
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.locationId ?? '__none__'} className="space-y-1">
              <div className="flex items-center gap-1.5 px-1">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-semibold text-foreground">{g.locationCode ?? '未指定庫位'}</span>
                <span className="text-[11px] text-muted-foreground">· {g.warehouseCode}</span>
                <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{g.items.length} 項</span>
              </div>
              <div className="rounded-xl border border-border bg-card px-3">
                {g.items.map((it) => (
                  <ItemRow
                    key={`${it.warehouseId}|${it.partId}`}
                    item={it}
                    busy={busy}
                    onPick={() => handlePick(it)}
                    onIssue={() => setIssueTarget(it)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {issueTarget ? (
        <IssueDialog item={issueTarget} busy={busy} onCancel={() => setIssueTarget(null)} onSubmit={handleIssue} />
      ) : null}
    </div>
  );
}
