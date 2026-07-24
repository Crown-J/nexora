// apps/nx-ui/src/features/nx03/workstation/packing/PackingBoard.tsx
/**
 * 包貨台兩區看板（WMS 2026-07-24 執行長拍板）。左右 1:3。
 *   左 = 已撿好的貨（待包暫存、依銷貨單分組）：勾整張單或單一品項。
 *   右 = 自取／寄貨／配送 三區：每區可「＋新箱」，把左邊勾選的貨「加入箱」，封箱。
 *   一箱可混多客戶（加入前若會混客戶跳確認、箱上標⚠）。出貨方式不符會擋。
 *   取消走自動（業務端取消 SO → 撿貨頁右欄），包貨端無手動取消。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, PackageCheck, PackagePlus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';

import {
  addToBox, createBox, discardBox, getPackWorkspace, removeFromBox, sealPacking,
  type PackBox, type PackWorkspace,
} from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

type Zone = 'P' | 'C' | 'D';
const ZONES: { id: Zone; label: string }[] = [
  { id: 'P', label: '自取' },
  { id: 'C', label: '寄貨' },
  { id: 'D', label: '配送' },
];
const TYPE_LABEL: Record<string, string> = { P: '自取', C: '寄貨', D: '配送' };

export function PackingBoard() {
  const [ws, setWs] = useState<PackWorkspace>({ pool: [], boxes: { P: [], C: [], D: [] } });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ message: string; run: () => Promise<PackWorkspace> } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      setWs(await getPackWorkspace({ search: search.trim() || undefined }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : '包貨台載入失敗');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  // 撿貨明細 → 該貨的客戶/出貨方式/單號（供混客戶判斷、方式檢查）
  const meta = useMemo(() => {
    const m = new Map<string, { customerName: string; deliveryType: string; soId: string }>();
    for (const so of ws.pool) for (const l of so.lines) m.set(l.pkItemId, { customerName: so.customerName, deliveryType: so.deliveryType, soId: so.soId });
    return m;
  }, [ws]);
  const warehouseId = ws.pool[0]?.warehouseId ?? '';
  const selArr = [...sel];
  const selTypes = new Set(selArr.map((id) => meta.get(id)?.deliveryType).filter(Boolean));
  const selType = selTypes.size === 1 ? [...selTypes][0] : null;

  const run = useCallback(async (fn: () => Promise<PackWorkspace>, okMsg: string, fallback: string) => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      setWs(await fn());
      setMsg(okMsg); setSel(new Set());
    } catch (e) {
      setErr((e instanceof Error ? e.message : fallback));
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleLine = (pkItemId: string) => setSel((p) => { const n = new Set(p); if (n.has(pkItemId)) n.delete(pkItemId); else n.add(pkItemId); return n; });
  const toggleSo = (pkItemIds: string[]) => setSel((p) => {
    const n = new Set(p);
    const allIn = pkItemIds.every((id) => n.has(id));
    for (const id of pkItemIds) { if (allIn) n.delete(id); else n.add(id); }
    return n;
  });

  const addSelectedToBox = (box: PackBox) => {
    if (!sel.size) return;
    if (selTypes.size > 1) { setErr('選取的貨含多種出貨方式、請分開加'); return; }
    if (selType && selType !== box.plType) { setErr(`選取的是「${TYPE_LABEL[selType!]}」的貨、不能加進「${TYPE_LABEL[box.plType]}」箱`); return; }
    const resultCustomers = new Set<string>([...box.lines.map((l) => l.customerName), ...selArr.map((id) => meta.get(id)?.customerName ?? '')]);
    const doAdd = () => addToBox(box.plId, selArr);
    if (resultCustomers.size > 1) {
      setConfirm({ message: `這箱會裝到不同客戶的貨（${[...resultCustomers].join('、')}），這不常見，確定要混裝？`, run: doAdd });
    } else {
      void run(doAdd, '已加入箱', '加入失敗');
    }
  };

  const totalPoolLines = ws.pool.reduce((n, so) => n + so.lines.length, 0);

  return (
    <div className="w-full space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl text-foreground"><Boxes className="h-5 w-5 text-primary" aria-hidden />包貨台</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 客戶 / 單號 / 料號" className="h-9 w-48 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted/30"><RefreshCw className="h-4 w-4" aria-hidden />重整</button>
        </div>
      </header>

      {err ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">{msg}</div> : null}
      {sel.size > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2 text-sm text-primary">
          已選 {sel.size} 項{selType ? `（${TYPE_LABEL[selType]}）` : '（含多種出貨方式）'}，到右邊按對應箱的「加入」
          <button type="button" onClick={() => setSel(new Set())} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><X className="h-3 w-3" aria-hidden />清除選取</button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">載入中…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* 左 1/4：已撿貨池 */}
          <div className="lg:col-span-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">已撿好的貨 <span className="text-xs font-normal text-muted-foreground">{ws.pool.length} 單 · {totalPoolLines} 項</span></div>
            {ws.pool.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">沒有撿好待包的貨</div>
            ) : (
              <div className="space-y-2">
                {ws.pool.map((so) => {
                  const ids = so.lines.map((l) => l.pkItemId);
                  const allSel = ids.every((id) => sel.has(id));
                  return (
                    <div key={so.soId} className="overflow-hidden rounded-lg border border-border bg-card">
                      <button type="button" onClick={() => toggleSo(ids)} className={cx('flex w-full items-center gap-2 border-b border-border/60 px-2.5 py-1.5 text-left', allSel ? 'bg-primary/10' : 'bg-muted/30')}>
                        <input type="checkbox" checked={allSel} readOnly className="h-3.5 w-3.5 accent-primary" />
                        <span className="truncate text-xs font-medium text-foreground">{so.customerName}</span>
                        <span className={cx('shrink-0 rounded px-1 py-0.5 text-[9px]', so.deliveryType === 'P' ? 'bg-primary/10 text-primary' : so.deliveryType === 'C' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600')}>{TYPE_LABEL[so.deliveryType]}</span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{so.soDocNo}</span>
                      </button>
                      <div>
                        {so.lines.map((l) => (
                          <button key={l.pkItemId} type="button" onClick={() => toggleLine(l.pkItemId)} className={cx('flex w-full items-center gap-2 px-2.5 py-1.5 text-left', sel.has(l.pkItemId) ? 'bg-primary/5' : 'hover:bg-muted/20')}>
                            <input type="checkbox" checked={sel.has(l.pkItemId)} readOnly className="h-3.5 w-3.5 accent-primary" />
                            <span className="truncate font-mono text-xs text-foreground">{l.partNo}</span>
                            <span className="ml-auto shrink-0 text-xs tabular-nums text-primary">×{l.qty}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右 3/4：三區建箱 */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {ZONES.map((z) => (
                <div key={z.id} className="flex flex-col rounded-xl border border-border bg-background/40">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <span className="text-sm font-semibold text-foreground">{z.label}</span>
                    <span className="text-xs text-muted-foreground">{ws.boxes[z.id].length} 箱</span>
                    <button type="button" disabled={busy || !warehouseId} onClick={() => void run(() => createBox(z.id, warehouseId), `已建${z.label}箱`, '建箱失敗')}
                      className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg border border-primary/50 bg-primary/5 px-2 text-xs font-medium text-primary disabled:opacity-30"><PackagePlus className="h-3.5 w-3.5" aria-hidden />新箱</button>
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {ws.boxes[z.id].length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">按「新箱」開一箱、再從左邊加貨</p>
                    ) : ws.boxes[z.id].map((box) => (
                      <BoxCard key={box.plId} box={box} busy={busy} canAdd={sel.size > 0}
                        onAdd={() => addSelectedToBox(box)}
                        onRemove={(pkItemId) => void run(() => removeFromBox(box.plId, pkItemId), '已退回左池', '移出失敗')}
                        onSeal={() => void run(() => sealPacking(box.plId).then(() => getPackWorkspace({ search: search.trim() || undefined })), '已封箱', '封箱失敗')}
                        onDiscard={() => setConfirm({ message: `丟棄箱 ${box.docNo}？箱內 ${box.lineCount} 項貨會退回左邊已撿池。`, run: () => discardBox(box.plId) })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
            <p className="text-sm text-foreground">{confirm.message}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground">取消</button>
              <button type="button" disabled={busy} onClick={() => { const c = confirm; setConfirm(null); void run(c.run, '已完成', '操作失敗'); }} className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-40">確定</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BoxCard({ box, busy, canAdd, onAdd, onRemove, onSeal, onDiscard }: {
  box: PackBox; busy: boolean; canAdd: boolean;
  onAdd: () => void; onRemove: (pkItemId: string) => void; onSeal: () => void; onDiscard: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-foreground">{box.docNo}</span>
        {box.mixedCustomer ? <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] text-amber-600"><Users className="h-2.5 w-2.5" aria-hidden />混客戶</span> : null}
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{box.lineCount} 項</span>
      </div>
      {box.lines.length > 0 ? (
        <div className="mt-1 space-y-0.5">
          {box.lines.map((l) => (
            <div key={l.plItemId} className="flex items-center gap-1.5 text-[11px]">
              <span className="truncate font-mono text-foreground">{l.partNo}</span>
              <span className="shrink-0 text-primary tabular-nums">×{l.qty}</span>
              <span className="ml-auto shrink-0 truncate text-muted-foreground">{l.customerName}</span>
              <button type="button" disabled={busy} onClick={() => onRemove(l.pkItemId)} aria-label="移出" className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-40"><X className="h-3 w-3" aria-hidden /></button>
            </div>
          ))}
        </div>
      ) : <p className="mt-1 text-center text-[10px] text-muted-foreground">空箱</p>}
      <div className="mt-2 flex gap-1.5">
        <button type="button" disabled={busy || !canAdd} onClick={onAdd} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-primary/50 bg-primary/5 text-xs font-medium text-primary disabled:opacity-30">加入選取</button>
        <button type="button" disabled={busy || box.lineCount === 0} onClick={onSeal} className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-600 px-2 text-xs font-medium text-white disabled:opacity-30"><PackageCheck className="h-3.5 w-3.5" aria-hidden />封箱</button>
        <button type="button" disabled={busy} onClick={onDiscard} aria-label="丟棄箱" className="inline-flex h-7 items-center rounded-lg border border-border px-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
      </div>
    </div>
  );
}
