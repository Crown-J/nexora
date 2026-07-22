// apps/nx-ui/src/features/nx03/workstation/picking/PickWorkbench.tsx
/**
 * 庫存中心 · 撿貨清單（電腦版、SALES-FLOW 撿貨重設計 2026-07-22）。
 *
 * 桌機用滑鼠 → 行內直接操作（不用選卡+dock）：每行有 部分數量輸入+撿 / 全部撿取 / 異常 / 重置。
 * 庫位軸、同（倉×料件）合併總量、進度條「已撿 X / 需 N」。
 * 網路策略：伺服器為準、按下即寫、動作後重抓、失敗明確可重試。
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, CheckCheck, ImageOff, MapPin, RefreshCw, RotateCcw, Search } from 'lucide-react';

import { partPhotoUrl } from '@data/endpoints/shared/part-photo/part-photo-api';
import {
  getPickList,
  pickAggregate,
  reportPickIssue,
  resetPick,
  type PickGroup,
  type PickItem,
} from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

function Thumb({ partId, photoId }: { partId: string; photoId: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!photoId || failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
        <ImageOff className="h-4 w-4" aria-hidden />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={partPhotoUrl(partId, photoId)} alt="" onError={() => setFailed(true)} className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />;
}

function IssueDialog({ item, busy, onCancel, onSubmit }: { item: PickItem; busy: boolean; onCancel: () => void; onSubmit: (t: 'D' | 'S', reason: string) => void }) {
  const [t, setT] = useState<'D' | 'S'>('S');
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
        <h2 className="text-base font-semibold text-foreground">異常回報</h2>
        <p className="text-xs text-muted-foreground">
          {item.partNo} · 對剩餘 <span className="font-semibold text-amber-600">{item.remainingQty}</span> 個開異常單
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['S', 'D'] as const).map((x) => (
            <button key={x} type="button" onClick={() => setT(x)} className={cx('h-10 rounded-lg border text-sm', t === x ? 'border-amber-500/60 bg-amber-500/10 text-amber-600' : 'border-border text-muted-foreground')}>
              {x === 'S' ? '數量短缺' : '東西損毀'}
            </button>
          ))}
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="說明（選填）" className="h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground">取消</button>
          <button type="button" disabled={busy} onClick={() => onSubmit(t, reason.trim())} className="h-9 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white disabled:opacity-40">開異常單</button>
        </div>
      </div>
    </div>
  );
}

function Row({ item, busy, onPartial, onFull, onIssue, onReset }: {
  item: PickItem;
  busy: boolean;
  onPartial: (qty: number) => void;
  onFull: () => void;
  onIssue: () => void;
  onReset: () => void;
}) {
  const need = Number(item.neededQty);
  const picked = Number(item.pickedQty);
  const rem = Number(item.remainingQty);
  const pct = need > 0 ? Math.min(100, Math.round((picked / need) * 100)) : 0;
  const [qty, setQty] = useState('');
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-border/60 px-4 py-3 first:border-t-0 hover:bg-muted/20">
      {/* 料件 */}
      <div className="flex min-w-0 items-center gap-3">
        <Thumb partId={item.partId} photoId={item.photoId} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-sm text-foreground">{item.partNo}</span>
            {item.brandName ? <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{item.brandName}</span> : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{item.partName}</p>
        </div>
      </div>
      {/* 進度 */}
      <div className="w-40">
        <div className="flex items-center justify-between text-xs tabular-nums">
          <span className="text-muted-foreground">已撿 <span className={picked > 0 ? 'font-semibold text-primary' : 'text-foreground'}>{picked}</span> / 需 {need}</span>
          <span className={cx('font-semibold', rem > 0 ? 'text-foreground' : 'text-emerald-600')}>剩 {rem}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cx('h-full rounded-full', picked >= need ? 'bg-emerald-600' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {/* 操作 */}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="1"
          max={rem}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="部分"
          className="h-9 w-16 rounded-lg border border-border bg-transparent px-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || !(Number(qty) > 0 && Number(qty) <= rem)}
          onClick={() => { onPartial(Number(qty)); setQty(''); }}
          className="h-9 rounded-lg border border-primary/50 bg-primary/5 px-3 text-xs font-medium text-primary disabled:opacity-30"
        >
          撿
        </button>
        <button type="button" disabled={busy} onClick={onFull} className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-600/90 disabled:opacity-40">
          <CheckCheck className="h-3.5 w-3.5" aria-hidden />全部
        </button>
        <button type="button" disabled={busy} onClick={onIssue} className="inline-flex h-9 items-center gap-1 rounded-lg border border-amber-500/50 px-3 text-xs text-amber-600 hover:bg-amber-500/10 disabled:opacity-40">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />異常
        </button>
        <button type="button" disabled={busy || picked <= 0} onClick={onReset} aria-label="重置" className="inline-flex h-9 items-center rounded-lg border border-border px-2 text-muted-foreground hover:bg-muted/40 disabled:opacity-30">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function PickWorkbench() {
  const [groups, setGroups] = useState<PickGroup[]>([]);
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
        setErr((e instanceof Error ? e.message : fallback) + '（未同步，可重試）');
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const allItems = groups.flatMap((g) => g.items);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl text-foreground">
            <Boxes className="h-5 w-5 text-primary" aria-hidden />
            庫存中心 · 撿貨清單
          </h1>
          <p className="text-xs text-muted-foreground">依庫位順路撿；行內「部分數量→撿」或「全部撿取」，有問題按「異常」對剩餘量開單</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30">
          <RefreshCw className="h-4 w-4" aria-hidden />重新整理
        </button>
      </header>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 料號 / 品名 / 廠牌" className="h-10 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{groups.length} 個庫位 · {allItems.length} 項待撿 · {lineCount} 筆需求</span>
      </div>

      {err ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">{msg}</div> : null}

      {loading ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">載入中…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">目前沒有待撿的貨</div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.locationId ?? '__none__'} className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-semibold text-foreground">{g.locationCode ?? '未指定庫位'}</span>
                <span className="text-xs text-muted-foreground">· {g.warehouseCode}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{g.items.length} 項</span>
              </div>
              <div className="bg-card">
                {g.items.map((it) => (
                  <Row
                    key={`${it.warehouseId}|${it.partId}`}
                    item={it}
                    busy={busy}
                    onPartial={(qty) => void run(() => pickAggregate(it.warehouseId, it.partId, qty), `已撿取 ${qty}：${it.partNo}`, '撿取失敗')}
                    onFull={() => void run(() => pickAggregate(it.warehouseId, it.partId), `已全部撿取：${it.partNo}`, '撿取失敗')}
                    onIssue={() => setIssueTarget(it)}
                    onReset={() => void run(() => resetPick(it.warehouseId, it.partId), `已重置：${it.partNo}`, '重置失敗')}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {issueTarget ? (
        <IssueDialog
          item={issueTarget}
          busy={busy}
          onCancel={() => setIssueTarget(null)}
          onSubmit={(t, reason) => {
            const it = issueTarget;
            setIssueTarget(null);
            void run(() => reportPickIssue({ warehouseId: it.warehouseId, partId: it.partId, issueType: t, reason }), `已開異常單：${it.partNo}`, '異常回報失敗');
          }}
        />
      ) : null}
    </div>
  );
}
