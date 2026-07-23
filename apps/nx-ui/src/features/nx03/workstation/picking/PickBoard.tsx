// apps/nx-ui/src/features/nx03/workstation/picking/PickBoard.tsx
/**
 * 撿貨三欄看板（WMS P2-4、2026-07-23 執行長拍板）。
 *
 * 電腦：左中右三欄並排；手機：三個分頁（待撿/已撿/已取消）。都是「點卡選取 → 按下方 DOCK 鈕」。
 *   左 待撿貨（庫位軸）：部分撿貨 / 完成撿貨 / 異常回報 → 撿完跑到中欄。
 *   中 已撿貨（依單號/客戶）：取消撿貨（誤按修正、退回左待撿）/ 異常回報；包貨拉走即消失。
 *   右 已取消（依單號/客戶）：已放回（二次確認、貨搬回原儲位）/ 異常回報。
 * 網路策略：伺服器為準、按下即寫、動作後重抓三欄、失敗可重試。
 */

'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Boxes, CheckCheck, ImageOff, MapPin, PackageCheck, RefreshCw, Search, Undo2, Users } from 'lucide-react';

import { partPhotoUrl } from '@data/endpoints/shared/part-photo/part-photo-api';
import {
  cancelPick, getCancelledList, getPickedList, getPickList, pickAggregate, putBack, reportPickIssue, stagedIssue,
  type GroupBy, type PickGroup, type PickItem, type StagedGroup, type StagedItem,
} from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

type Col = 'L' | 'M' | 'R';
type SelLeft = { warehouseId: string; partId: string; partNo: string } | null;
type SelStaged = { soId: string; partId: string; warehouseId: string; partNo: string } | null;

function Thumb({ partId, photoId }: { partId: string; photoId: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!photoId || failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
        <ImageOff className="h-4 w-4" aria-hidden />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={partPhotoUrl(partId, photoId)} alt="" onError={() => setFailed(true)} className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover" />;
}

function IssueDialog({ label, busy, onCancel, onSubmit }: { label: string; busy: boolean; onCancel: () => void; onSubmit: (t: 'D' | 'S', reason: string) => void }) {
  const [t, setT] = useState<'D' | 'S'>('S');
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
        <h2 className="text-base font-semibold text-foreground">異常回報</h2>
        <p className="text-xs text-muted-foreground">{label}</p>
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

function ConfirmDialog({ title, message, busy, onCancel, onConfirm }: { title: string; message: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground">取消</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-40">確認</button>
        </div>
      </div>
    </div>
  );
}

const COL_META: Record<Col, { title: string; hint: string }> = {
  L: { title: '待撿貨', hint: '依庫位順路撿' },
  M: { title: '已撿貨', hint: '撿完待包（依單號）' },
  R: { title: '已取消', hint: '訂單取消、待放回' },
};

export function PickBoard() {
  const [left, setLeft] = useState<PickGroup[]>([]);
  const [leftLineCount, setLeftLineCount] = useState(0);
  const [middle, setMiddle] = useState<StagedGroup[]>([]);
  const [right, setRight] = useState<StagedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('location'); // 分組方式：依庫位 / 依客戶
  const [tab, setTab] = useState<Col>('L'); // 手機分頁

  const [selL, setSelL] = useState<SelLeft>(null);
  const [selM, setSelM] = useState<SelStaged>(null);
  const [selR, setSelR] = useState<SelStaged>(null);
  const [partial, setPartial] = useState('');
  const [issue, setIssue] = useState<{ col: Col; label: string; run: (t: 'D' | 'S', reason: string) => Promise<unknown> } | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; run: () => Promise<unknown> } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const s = search.trim() || undefined;
      const [l, m, r] = await Promise.all([getPickList({ search: s, groupBy }), getPickedList({ search: s, groupBy }), getCancelledList({ search: s, groupBy })]);
      setLeft(l.groups); setLeftLineCount(l.lineCount);
      setMiddle(m.groups); setRight(r.groups);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '撿貨看板載入失敗');
    } finally {
      setLoading(false);
    }
  }, [search, groupBy]);

  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (fn: () => Promise<unknown>, okMsg: string, fallback: string) => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      setSelL(null); setSelM(null); setSelR(null); setPartial('');
      await load();
    } catch (e) {
      setErr((e instanceof Error ? e.message : fallback) + '（未同步，可重試）');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const leftItems = left.flatMap((g) => g.items);
  const midCount = middle.reduce((n, g) => n + g.items.length, 0);
  const rightCount = right.reduce((n, g) => n + g.items.length, 0);

  // ── 左欄（庫位軸、選卡） ──
  const renderLeft = () => (
    left.length === 0
      ? <Empty text="目前沒有待撿的貨" />
      : <div className="space-y-4">
          {left.map((g) => (
            <div key={g.title} className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                {groupBy === 'location' ? <MapPin className="h-4 w-4 text-primary" aria-hidden /> : <Users className="h-4 w-4 text-primary" aria-hidden />}
                <span className="truncate text-sm font-semibold text-foreground">{g.title}</span>
                {groupBy === 'location' && g.warehouseCode ? <span className="shrink-0 text-xs text-muted-foreground">· {g.warehouseCode}</span> : null}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{g.items.length} 項</span>
              </div>
              <div className="bg-card">
                {g.items.map((it) => {
                  const sel = selL?.warehouseId === it.warehouseId && selL?.partId === it.partId;
                  return <LeftCard key={`${it.warehouseId}|${it.partId}`} it={it} showLoc={groupBy === 'customer'} sel={sel} onSelect={() => setSelL(sel ? null : { warehouseId: it.warehouseId, partId: it.partId, partNo: it.partNo })} />;
                })}
              </div>
            </div>
          ))}
        </div>
  );

  const renderStaged = (groups: StagedGroup[], col: 'M' | 'R') => {
    const sel = col === 'M' ? selM : selR;
    const setSel = col === 'M' ? setSelM : setSelR;
    return groups.length === 0
      ? <Empty text={col === 'M' ? '目前沒有已撿待包的貨' : '目前沒有待放回的貨'} />
      : <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.title} className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                {groupBy === 'location' ? <MapPin className="h-4 w-4 text-primary" aria-hidden /> : <Users className="h-4 w-4 text-primary" aria-hidden />}
                <span className="truncate text-sm font-semibold text-foreground">{g.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{g.items.length} 項</span>
              </div>
              <div className="bg-card">
                {g.items.map((it) => {
                  const s = sel?.soId === it.soId && sel?.partId === it.partId;
                  return <StagedCard key={`${it.soId}|${it.partId}`} it={it} showCustomer={groupBy === 'location'} sel={s}
                    onSelect={() => setSel(s ? null : { soId: it.soId, partId: it.partId, warehouseId: it.warehouseId, partNo: it.partNo })} />;
                })}
              </div>
            </div>
          ))}
        </div>;
  };

  // ── 各欄 dock ──
  const dockL = (
    <div className="flex items-center gap-1.5">
      <input type="number" min="1" value={partial} onChange={(e) => setPartial(e.target.value)} placeholder="數量" disabled={!selL}
        className="h-9 w-16 rounded-lg border border-border bg-transparent px-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-40" />
      <button type="button" disabled={busy || !selL || !(Number(partial) > 0)}
        onClick={() => selL && run(() => pickAggregate(selL.warehouseId, selL.partId, Number(partial)), `部分撿取：${selL.partNo}`, '撿取失敗')}
        className="h-9 rounded-lg border border-primary/50 bg-primary/5 px-3 text-xs font-medium text-primary disabled:opacity-30">部分撿貨</button>
      <button type="button" disabled={busy || !selL}
        onClick={() => selL && run(() => pickAggregate(selL.warehouseId, selL.partId), `已全部撿取：${selL.partNo}`, '撿取失敗')}
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" aria-hidden />完成撿貨</button>
      <button type="button" disabled={busy || !selL}
        onClick={() => selL && setIssue({ col: 'L', label: `${selL.partNo}：對剩餘量開異常單`, run: (t, reason) => reportPickIssue({ warehouseId: selL.warehouseId, partId: selL.partId, issueType: t, reason }) })}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-amber-500/50 px-3 text-xs text-amber-600 disabled:opacity-40"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />異常回報</button>
    </div>
  );

  const dockM = (
    <div className="flex items-center gap-1.5">
      <button type="button" disabled={busy || !selM}
        onClick={() => selM && run(() => cancelPick(selM.soId, selM.partId, selM.warehouseId), `取消撿貨：${selM.partNo}（退回待撿）`, '取消撿貨失敗')}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs text-muted-foreground disabled:opacity-40"><Undo2 className="h-3.5 w-3.5" aria-hidden />取消撿貨</button>
      <button type="button" disabled={busy || !selM}
        onClick={() => selM && setIssue({ col: 'M', label: `${selM.partNo}：對已撿貨開異常單`, run: (t, reason) => stagedIssue({ soId: selM.soId, partId: selM.partId, warehouseId: selM.warehouseId, issueType: t, reason }) })}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-amber-500/50 px-3 text-xs text-amber-600 disabled:opacity-40"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />異常回報</button>
    </div>
  );

  const dockR = (
    <div className="flex items-center gap-1.5">
      <button type="button" disabled={busy || !selR}
        onClick={() => selR && setConfirm({ message: `確認「${selR.partNo}」已放回原庫位？放回後即從此清單移除。`, run: () => putBack(selR.soId, selR.partId, selR.warehouseId) })}
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:opacity-40"><PackageCheck className="h-3.5 w-3.5" aria-hidden />已放回</button>
      <button type="button" disabled={busy || !selR}
        onClick={() => selR && setIssue({ col: 'R', label: `${selR.partNo}：對待放回貨開異常單`, run: (t, reason) => stagedIssue({ soId: selR.soId, partId: selR.partId, warehouseId: selR.warehouseId, issueType: t, reason }) })}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-amber-500/50 px-3 text-xs text-amber-600 disabled:opacity-40"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />異常回報</button>
    </div>
  );

  const colBody: Record<Col, ReactNode> = { L: renderLeft(), M: renderStaged(middle, 'M'), R: renderStaged(right, 'R') };
  const colDock: Record<Col, ReactNode> = { L: dockL, M: dockM, R: dockR };
  const colCount: Record<Col, number> = { L: leftItems.length, M: midCount, R: rightCount };

  return (
    <div className="w-full space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl text-foreground"><Boxes className="h-5 w-5 text-primary" aria-hidden />撿貨看板</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* 分組切換：依庫位 / 依客戶 */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {(['location', 'customer'] as GroupBy[]).map((gb) => (
              <button key={gb} type="button" onClick={() => setGroupBy(gb)}
                className={cx('inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium', groupBy === gb ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
                {gb === 'location' ? <MapPin className="h-3.5 w-3.5" aria-hidden /> : <Users className="h-3.5 w-3.5" aria-hidden />}
                {gb === 'location' ? '依庫位' : '依客戶'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 料號 / 品名 / 單號 / 客戶" className="h-9 w-52 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted/30"><RefreshCw className="h-4 w-4" aria-hidden />重整</button>
        </div>
      </header>

      {err ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">{msg}</div> : null}

      {/* 手機：分頁 */}
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1 md:hidden">
        {(['L', 'M', 'R'] as Col[]).map((c) => (
          <button key={c} type="button" onClick={() => setTab(c)} className={cx('rounded-md py-2 text-xs font-medium', tab === c ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
            {COL_META[c].title}<span className="ml-1 tabular-nums">{colCount[c]}</span>
          </button>
        ))}
      </div>

      {loading ? <Empty text="載入中…" /> : (
        <>
          {/* 手機：單欄（active tab）+ 底部 dock */}
          <div className="md:hidden">
            <p className="mb-2 text-xs text-muted-foreground">{COL_META[tab].hint}</p>
            <div className="pb-24">{colBody[tab]}</div>
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-2 backdrop-blur pb-[env(safe-area-inset-bottom)]">
              <div className="mx-auto flex max-w-7xl justify-center">{colDock[tab]}</div>
            </div>
          </div>

          {/* 電腦：三欄並排、各欄自帶 dock */}
          <div className="hidden gap-4 md:grid md:grid-cols-3">
            {(['L', 'M', 'R'] as Col[]).map((c) => (
              <div key={c} className="flex min-h-[60vh] flex-col rounded-xl border border-border bg-background/40">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <span className="text-sm font-semibold text-foreground">{COL_META[c].title}</span>
                  <span className="text-xs text-muted-foreground">{COL_META[c].hint}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{colCount[c]}{c === 'L' ? ` 項 · ${leftLineCount} 需求` : ' 項'}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3">{colBody[c]}</div>
                <div className="border-t border-border p-2">{colDock[c]}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {issue ? (
        <IssueDialog label={issue.label} busy={busy} onCancel={() => setIssue(null)}
          onSubmit={(t, reason) => { const i = issue; setIssue(null); void run(() => i.run(t, reason), '已開異常單', '異常回報失敗'); }} />
      ) : null}
      {confirm ? (
        <ConfirmDialog title="確認放回" message={confirm.message} busy={busy} onCancel={() => setConfirm(null)}
          onConfirm={() => { const c = confirm; setConfirm(null); void run(c.run, '已放回', '放回失敗'); }} />
      ) : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function LeftCard({ it, showLoc, sel, onSelect }: { it: PickItem; showLoc: boolean; sel: boolean; onSelect: () => void }) {
  const need = Number(it.neededQty), picked = Number(it.pickedQty), rem = Number(it.remainingQty);
  const pct = need > 0 ? Math.min(100, Math.round((picked / need) * 100)) : 0;
  return (
    <button type="button" onClick={onSelect} className={cx('flex w-full items-center gap-3 border-t border-border/60 px-3 py-2.5 text-left first:border-t-0', sel ? 'bg-primary/10' : 'hover:bg-muted/20')}>
      <Thumb partId={it.partId} photoId={it.photoId} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono text-sm text-foreground">{it.partNo}</span>
          {it.brandName ? <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{it.brandName}</span> : null}
          {showLoc && it.locationCode ? <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden />{it.locationCode}</span> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{it.partName}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={cx('h-full rounded-full', picked >= need ? 'bg-emerald-600' : 'bg-primary')} style={{ width: `${pct}%` }} /></div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">已撿 {picked}/需 {need} <span className={rem > 0 ? 'text-foreground' : 'text-emerald-600'}>剩 {rem}</span></span>
        </div>
      </div>
    </button>
  );
}

function StagedCard({ it, showCustomer, sel, onSelect }: { it: StagedItem; showCustomer: boolean; sel: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={cx('flex w-full items-center gap-3 border-t border-border/60 px-3 py-2.5 text-left first:border-t-0', sel ? 'bg-primary/10' : 'hover:bg-muted/20')}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-mono text-sm font-semibold text-foreground">{it.partNo}</span>
          <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">×{it.qty}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{it.partName}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono">{it.soDocNo}</span>
          {showCustomer ? <span className="truncate">· {it.customerName}</span> : null}
          {it.locationCode ? <span className="shrink-0 rounded bg-muted px-1 py-0.5">{it.locationCode}</span> : null}
        </div>
      </div>
    </button>
  );
}
