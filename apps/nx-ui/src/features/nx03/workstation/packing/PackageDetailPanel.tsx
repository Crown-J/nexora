// apps/nx-ui/src/features/nx03/workstation/packing/PackageDetailPanel.tsx
/**
 * 包裹明細面板（WMS 2026-07-24、DocWorkbench DetailPanel）。
 *   建箱中(C)：可從同出貨方式已撿池加貨、移出、封箱、丟棄。
 *   已封箱/寄出：唯讀顯示箱內貨。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PackageCheck, Trash2, Users, X } from 'lucide-react';

import {
  addToBox, discardBox, getPackWorkspace, getPacking, removeFromBox, sealPacking,
  type PackBox, type PackWorkspace, type PackingDetail,
} from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

const TYPE_LABEL: Record<string, string> = { P: '自取', C: '寄貨', D: '配送' };

export function PackageDetailPanel({ id, onChanged }: { id: string; onChanged: () => void | Promise<void> }) {
  const [ws, setWs] = useState<PackWorkspace | null>(null);
  const [sealed, setSealed] = useState<PackingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ message: string; run: () => Promise<unknown> } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const w = await getPackWorkspace();
      const found = [...w.boxes.P, ...w.boxes.C, ...w.boxes.D].find((b) => b.plId === id);
      if (found) { setWs(w); setSealed(null); }
      else { setWs(null); setSealed(await getPacking(id)); } // 已封箱 → 唯讀
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入包裹失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const box: PackBox | null = useMemo(() => {
    if (!ws) return null;
    return [...ws.boxes.P, ...ws.boxes.C, ...ws.boxes.D].find((b) => b.plId === id) ?? null;
  }, [ws, id]);
  const poolForBox = box && ws ? ws.pool.filter((so) => so.deliveryType === box.plType) : [];

  const run = useCallback(async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true); setErr(null);
    try { await fn(); setSel(new Set()); await load(); await onChanged(); }
    catch (e) { setErr(e instanceof Error ? e.message : okMsg + '失敗'); }
    finally { setBusy(false); }
  }, [load, onChanged]);

  const toggle = (id2: string) => setSel((p) => { const n = new Set(p); if (n.has(id2)) n.delete(id2); else n.add(id2); return n; });
  const toggleSo = (ids: string[]) => setSel((p) => { const n = new Set(p); const allIn = ids.every((i) => n.has(i)); for (const i of ids) { if (allIn) n.delete(i); else n.add(i); } return n; });

  const addSelected = () => {
    if (!box || !sel.size) return;
    const selCustomers = new Set<string>();
    for (const so of poolForBox) if (so.lines.some((l) => sel.has(l.pkItemId))) selCustomers.add(so.customerName);
    const resultCustomers = new Set<string>([...box.lines.map((l) => l.customerName), ...selCustomers]);
    const doAdd = () => addToBox(box.plId, [...sel]);
    if (resultCustomers.size > 1) setConfirm({ message: `這箱會裝到不同客戶的貨（${[...resultCustomers].join('、')}），確定混裝？`, run: doAdd });
    else void run(doAdd, '加入');
  };

  if (loading) return <div className="p-6 text-center text-sm text-muted-foreground">載入中…</div>;

  // 已封箱唯讀
  if (sealed) {
    return (
      <div className="space-y-3 p-1">
        {err ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{err}</div> : null}
        <div className="flex items-center gap-2">
          <span className="font-mono text-base text-foreground">{sealed.docNo}</span>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">已封箱</span>
          <span className="text-xs text-muted-foreground">{TYPE_LABEL[sealed.plType] ?? sealed.plType}</span>
        </div>
        {sealed.parcels.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-muted/30 px-3 py-1.5 font-mono text-xs text-foreground">{p.parcelNo}</div>
            {p.lines.map((l) => (
              <div key={l.id} className="flex items-center gap-2 border-t border-border/60 px-3 py-1.5 text-sm first:border-t-0">
                <span className="truncate font-mono text-foreground">{l.partNo}</span>
                <span className="shrink-0 text-primary tabular-nums">×{l.qty}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{l.soDocNo ?? ''}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!box) return <div className="p-6 text-center text-sm text-muted-foreground">找不到此包裹</div>;

  return (
    <div className="space-y-3 p-1">
      {err ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{err}</div> : null}
      <div className="flex items-center gap-2">
        <span className="font-mono text-base text-foreground">{box.docNo}</span>
        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">建箱中</span>
        <span className="text-xs text-muted-foreground">{TYPE_LABEL[box.plType]}</span>
        {box.mixedCustomer ? <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-600"><Users className="h-3 w-3" aria-hidden />混 {box.customerCount} 客戶</span> : null}
        <div className="ml-auto flex gap-2">
          <button type="button" disabled={busy || box.lineCount === 0} onClick={() => void run(() => sealPacking(box.plId), '封箱')} className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white disabled:opacity-30"><PackageCheck className="h-4 w-4" aria-hidden />封箱</button>
          <button type="button" disabled={busy} onClick={() => setConfirm({ message: `丟棄箱 ${box.docNo}？箱內貨會退回已撿池。`, run: () => discardBox(box.plId) })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-sm text-muted-foreground hover:text-destructive disabled:opacity-40"><Trash2 className="h-4 w-4" aria-hidden />丟棄</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 text-sm font-semibold text-foreground">箱內貨 <span className="text-xs font-normal text-muted-foreground">{box.lineCount} 項</span></div>
          {box.lines.length === 0 ? <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">空箱、從右邊加貨</div> : (
            <div className="overflow-hidden rounded-lg border border-border">
              {box.lines.map((l) => (
                <div key={l.plItemId} className="flex items-center gap-2 border-t border-border/60 px-3 py-2 text-sm first:border-t-0">
                  <span className="truncate font-mono text-foreground">{l.partNo}</span>
                  <span className="shrink-0 text-primary tabular-nums">×{l.qty}</span>
                  <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">{l.customerName}</span>
                  <button type="button" disabled={busy} onClick={() => void run(() => removeFromBox(box.plId, l.pkItemId), '移出')} aria-label="移出" className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-40"><X className="h-4 w-4" aria-hidden /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">可加入（{TYPE_LABEL[box.plType]}）
            <button type="button" disabled={busy || sel.size === 0} onClick={addSelected} className="ml-auto inline-flex h-7 items-center rounded-lg border border-primary/50 bg-primary/5 px-2.5 text-xs font-medium text-primary disabled:opacity-30">加入 {sel.size > 0 ? `(${sel.size})` : ''}</button>
          </div>
          {poolForBox.length === 0 ? <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">沒有可加的{TYPE_LABEL[box.plType]}貨</div> : (
            <div className="space-y-1.5">
              {poolForBox.map((so) => {
                const ids = so.lines.map((l) => l.pkItemId);
                const allSel = ids.every((i) => sel.has(i));
                return (
                  <div key={so.soId} className="overflow-hidden rounded-lg border border-border bg-card">
                    <button type="button" onClick={() => toggleSo(ids)} className={cx('flex w-full items-center gap-2 border-b border-border/60 px-2.5 py-1.5 text-left', allSel ? 'bg-primary/10' : 'bg-muted/30')}>
                      <input type="checkbox" checked={allSel} readOnly className="h-3.5 w-3.5 accent-primary" />
                      <span className="truncate text-xs font-medium text-foreground">{so.customerName}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{so.soDocNo}</span>
                    </button>
                    {so.lines.map((l) => (
                      <button key={l.pkItemId} type="button" onClick={() => toggle(l.pkItemId)} className={cx('flex w-full items-center gap-2 px-2.5 py-1.5 text-left', sel.has(l.pkItemId) ? 'bg-primary/5' : 'hover:bg-muted/20')}>
                        <input type="checkbox" checked={sel.has(l.pkItemId)} readOnly className="h-3.5 w-3.5 accent-primary" />
                        <span className="truncate font-mono text-xs text-foreground">{l.partNo}</span>
                        <span className="ml-auto shrink-0 text-xs text-primary tabular-nums">×{l.qty}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
            <p className="text-sm text-foreground">{confirm.message}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground">取消</button>
              <button type="button" disabled={busy} onClick={() => { const c = confirm; setConfirm(null); void run(c.run, '操作'); }} className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-40">確定</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
