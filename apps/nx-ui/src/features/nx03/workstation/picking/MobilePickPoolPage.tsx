// apps/nx-ui/src/features/nx03/workstation/picking/MobilePickPoolPage.tsx
/**
 * 庫存中心 · 撿貨清單（手機版、SALES-FLOW 撿貨重設計 2026-07-22）。
 *
 * 庫位軸 + 選卡即作用：清單依庫位分組、同（倉×料件）合併總量、顯「已撿 X / 需 N」。
 *   先點一張卡片選取 → 底部 dock 四鈕作用在選取卡：部分撿取 / 全部撿取 / 異常回報 / 重置數量。
 *   部分撿取＝分次撿、剩餘掛待撿；異常＝對剩餘量開正式異常回報單；重置＝已撿量歸零。
 *
 * 網路策略：伺服器為準、按下即寫、動作後重抓真實狀態、失敗明確可重試（不本地暫存）。
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, CheckCheck, ImageOff, MapPin, PackageMinus, RefreshCw, RotateCcw, Search } from 'lucide-react';

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

import { PutbackBanner } from './PutbackBanner';

const keyOf = (it: { warehouseId: string; partId: string }) => `${it.warehouseId}|${it.partId}`;

function Thumb({ partId, photoId, size }: { partId: string; photoId: string | null; size: string }) {
  const [failed, setFailed] = useState(false);
  if (!photoId || failed) {
    return (
      <div className={cx(size, 'flex shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground')}>
        <ImageOff className="h-5 w-5" aria-hidden />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={partPhotoUrl(partId, photoId)} alt="" onError={() => setFailed(true)} className={cx(size, 'shrink-0 rounded-lg border border-border object-cover')} />;
}

function ItemCard({ item, selected, onSelect }: { item: PickItem; selected: boolean; onSelect: () => void }) {
  const need = Number(item.neededQty);
  const picked = Number(item.pickedQty);
  const pct = need > 0 ? Math.min(100, Math.round((picked / need) * 100)) : 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        'flex w-full items-center gap-3.5 border-t border-border/60 py-3.5 text-left first:border-t-0',
        selected ? 'bg-primary/5' : '',
      )}
    >
      <Thumb partId={item.partId} photoId={item.photoId} size="h-16 w-16" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-base text-foreground">{item.partNo}</span>
          {item.brandName ? (
            <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{item.brandName}</span>
          ) : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">{item.partName}</p>
        <div className="flex items-center gap-2.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cx('h-full rounded-full', picked >= need ? 'bg-emerald-600' : 'bg-primary')} style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-sm tabular-nums text-foreground">
            已撿 <span className={cx('text-base', picked > 0 ? 'font-semibold text-primary' : '')}>{picked}</span> / 需 {need}
          </span>
        </div>
      </div>
      <div className={cx('h-6 w-6 shrink-0 rounded-full border-2', selected ? 'border-primary bg-primary' : 'border-border')} />
    </button>
  );
}

function PartialDialog({ item, busy, onCancel, onSubmit }: { item: PickItem; busy: boolean; onCancel: () => void; onSubmit: (qty: number) => void }) {
  const rem = Number(item.remainingQty);
  const [qty, setQty] = useState(String(rem));
  const n = Number(qty);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
        <h2 className="text-base font-semibold text-foreground">部分撿取</h2>
        <p className="text-xs text-muted-foreground">{item.partNo} · {item.partName}（剩 {rem}）</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setQty(String(Math.max(1, n - 1)))} className="h-11 w-11 rounded-lg border border-border text-lg text-foreground">−</button>
          <input
            type="number"
            min="1"
            max={rem}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-11 flex-1 rounded-lg border border-border bg-transparent text-center text-lg text-foreground focus:outline-none"
          />
          <button type="button" onClick={() => setQty(String(Math.min(rem, n + 1)))} className="h-11 w-11 rounded-lg border border-border text-lg text-foreground">＋</button>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground">取消</button>
          <button
            type="button"
            disabled={busy || !(n > 0 && n <= rem)}
            onClick={() => onSubmit(n)}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            撿取 {n > 0 ? n : ''}
          </button>
        </div>
      </div>
    </div>
  );
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
            <button
              key={x}
              type="button"
              onClick={() => setT(x)}
              className={cx('h-10 rounded-lg border text-sm', t === x ? 'border-amber-500/60 bg-amber-500/10 text-amber-600' : 'border-border text-muted-foreground')}
            >
              {x === 'S' ? '數量短缺' : '東西損毀'}
            </button>
          ))}
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          placeholder="說明（選填）"
          className="h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground">取消</button>
          <button type="button" disabled={busy} onClick={() => onSubmit(t, reason.trim())} className="h-9 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white disabled:opacity-40">開異常單</button>
        </div>
      </div>
    </div>
  );
}

export function MobilePickPoolPage() {
  const [groups, setGroups] = useState<PickGroup[]>([]);
  const [lineCount, setLineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'partial' | 'issue' | null>(null);

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

  const allItems = groups.flatMap((g) => g.items);
  const sel = selected ? allItems.find((i) => keyOf(i) === selected) ?? null : null;

  const run = useCallback(
    async (fn: () => Promise<unknown>, okMsg: string, fallback: string) => {
      setBusy(true);
      setErr(null);
      setMsg(null);
      try {
        await fn();
        setMsg(okMsg);
        await load(); // 動作後重抓真實狀態
      } catch (e) {
        setErr((e instanceof Error ? e.message : fallback) + '（未同步，可重試）');
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const doFull = () => sel && void run(() => pickAggregate(sel.warehouseId, sel.partId), `已全部撿取：${sel.partNo}`, '撿取失敗');
  const doPartial = (qty: number) => {
    if (!sel) return;
    setDialog(null);
    void run(() => pickAggregate(sel.warehouseId, sel.partId, qty), `已撿取 ${qty}：${sel.partNo}`, '撿取失敗');
  };
  const doIssue = (t: 'D' | 'S', reason: string) => {
    if (!sel) return;
    setDialog(null);
    void run(() => reportPickIssue({ warehouseId: sel.warehouseId, partId: sel.partId, issueType: t, reason }), `已開異常單：${sel.partNo}`, '異常回報失敗');
  };
  const doReset = () => sel && void run(() => resetPick(sel.warehouseId, sel.partId), `已重置：${sel.partNo}`, '重置失敗');

  return (
    <div className="w-full space-y-3 px-2 py-3 pb-28">
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-lg text-foreground">
            <Boxes className="h-5 w-5 text-primary" aria-hidden />
            庫存中心 · 撿貨清單
          </h1>
          <p className="text-xs text-muted-foreground">依庫位順路撿；先點卡片、再按下方按鈕</p>
        </div>
        <button type="button" onClick={() => void load()} aria-label="重新整理" className="rounded-lg border border-border p-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 料號 / 品名 / 廠牌" className="h-10 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
      </div>

      <div className="text-xs text-muted-foreground tabular-nums">{groups.length} 個庫位 · {allItems.length} 項待撿 · {lineCount} 筆需求</div>

      <PutbackBanner />

      {err ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-600">{msg}</div> : null}

      {loading ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">載入中…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">目前沒有待撿的貨</div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.locationId ?? '__none__'} className="space-y-1">
              <div className="flex items-center gap-1.5 px-1">
                <MapPin className="h-5 w-5 text-primary" aria-hidden />
                <span className="text-base font-semibold text-foreground">{g.locationCode ?? '未指定庫位'}</span>
                <span className="text-xs text-muted-foreground">· {g.warehouseCode}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{g.items.length} 項</span>
              </div>
              <div className="rounded-xl border border-border bg-card px-3.5">
                {g.items.map((it) => (
                  <ItemCard key={keyOf(it)} item={it} selected={selected === keyOf(it)} onSelect={() => setSelected(keyOf(it))} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部 dock */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid w-full grid-cols-4 gap-1 p-2">
          <DockBtn icon={PackageMinus} label="部分撿取" disabled={!sel || busy} onClick={() => setDialog('partial')} />
          <DockBtn icon={CheckCheck} label="全部撿取" tone="emerald" disabled={!sel || busy} onClick={doFull} />
          <DockBtn icon={AlertTriangle} label="異常回報" tone="amber" disabled={!sel || busy} onClick={() => setDialog('issue')} />
          <DockBtn icon={RotateCcw} label="重置數量" disabled={!sel || busy} onClick={doReset} />
        </div>
        {sel ? (
          <div className="border-t border-border/60 px-3 py-1.5 text-center text-xs text-muted-foreground">
            已選：<span className="font-mono text-sm text-foreground">{sel.partNo}</span> · 剩 {sel.remainingQty}
          </div>
        ) : (
          <div className="border-t border-border/60 px-3 py-1.5 text-center text-xs text-muted-foreground">先點一張卡片作用</div>
        )}
      </div>

      {dialog === 'partial' && sel ? <PartialDialog item={sel} busy={busy} onCancel={() => setDialog(null)} onSubmit={doPartial} /> : null}
      {dialog === 'issue' && sel ? <IssueDialog item={sel} busy={busy} onCancel={() => setDialog(null)} onSubmit={doIssue} /> : null}
    </div>
  );
}

function DockBtn({ icon: Icon, label, tone, disabled, onClick }: { icon: typeof CheckCheck; label: string; tone?: 'emerald' | 'amber'; disabled: boolean; onClick: () => void }) {
  const toneCls = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-foreground';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 transition-colors hover:bg-muted/40 disabled:opacity-30"
    >
      <Icon className={cx('h-7 w-7', toneCls)} aria-hidden />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}
