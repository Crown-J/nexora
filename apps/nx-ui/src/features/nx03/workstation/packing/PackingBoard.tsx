// apps/nx-ui/src/features/nx03/workstation/packing/PackingBoard.tsx
/**
 * 包貨台（WMS 2026-07-24 執行長拍板改版）：仿銷貨單據的兩分頁殼。
 *   TAB1 包裹列表：所有建箱中的箱（可＋新箱、點列進明細）。
 *   TAB2 包裹明細：一個箱的內容 + 從「已撿貨池」加貨（只顯示同出貨方式的貨）+ 封箱/丟棄。
 *   一箱可混多客戶（加入前若會混跳確認、箱上標⚠）。取消走自動（業務端取消 SO），包貨端無手動取消。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes, PackageCheck, PackagePlus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';

import {
  addToBox, createBox, discardBox, getPackWorkspace, removeFromBox, sealPacking,
  type PackWorkspace,
} from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

const TYPE_LABEL: Record<string, string> = { P: '自取', C: '寄貨', D: '配送' };
const TYPE_TONE: Record<string, string> = {
  P: 'bg-primary/10 text-primary',
  C: 'bg-emerald-500/10 text-emerald-600',
  D: 'bg-blue-500/10 text-blue-600',
};

export function PackingBoard() {
  const [ws, setWs] = useState<PackWorkspace>({ pool: [], boxes: { P: [], C: [], D: [] } });
  const [tab, setTab] = useState<'list' | 'detail'>('list');
  const [selId, setSelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set()); // 明細頁加貨選取
  const [confirm, setConfirm] = useState<{ message: string; run: () => Promise<PackWorkspace>; back?: boolean } | null>(null);

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

  const allBoxes = useMemo(() => [...ws.boxes.P, ...ws.boxes.C, ...ws.boxes.D], [ws]);
  const box = allBoxes.find((b) => b.plId === selId) ?? null;
  const warehouseId = ws.pool[0]?.warehouseId ?? '';

  // 明細頁：只顯示與本箱同出貨方式的已撿池
  const poolForBox = box ? ws.pool.filter((so) => so.deliveryType === box.plType) : [];
  const selArr = [...sel];

  const run = useCallback(async (fn: () => Promise<PackWorkspace>, okMsg: string, fallback: string, opts?: { toList?: boolean }) => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      setWs(await fn());
      setMsg(okMsg); setSel(new Set());
      if (opts?.toList) { setTab('list'); setSelId(null); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  }, []);

  // 建箱後直接進其明細（用 plId 差集找新箱）
  const createAndOpen = async (deliveryType: 'D' | 'P' | 'C') => {
    if (!warehouseId) return;
    setBusy(true); setErr(null); setMsg(null);
    try {
      const before = new Set(allBoxes.map((b) => b.plId));
      const next = await createBox(deliveryType, warehouseId);
      setWs(next);
      const created = [...next.boxes.P, ...next.boxes.C, ...next.boxes.D].find((b) => !before.has(b.plId));
      if (created) { setSelId(created.plId); setTab('detail'); setSel(new Set()); }
      setMsg(`已建${TYPE_LABEL[deliveryType]}箱`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建箱失敗');
    } finally {
      setBusy(false);
    }
  };

  const openBox = (plId: string) => { setSelId(plId); setSel(new Set()); setTab('detail'); };

  const toggleLine = (id: string) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSo = (ids: string[]) => setSel((p) => { const n = new Set(p); const allIn = ids.every((i) => n.has(i)); for (const i of ids) { if (allIn) n.delete(i); else n.add(i); } return n; });

  const addSelected = () => {
    if (!box || !sel.size) return;
    const selCustomers = new Set<string>();
    for (const so of poolForBox) if (so.lines.some((l) => sel.has(l.pkItemId))) selCustomers.add(so.customerName);
    const resultCustomers = new Set<string>([...box.lines.map((l) => l.customerName), ...selCustomers]);
    const doAdd = () => addToBox(box.plId, selArr);
    if (resultCustomers.size > 1) setConfirm({ message: `這箱會裝到不同客戶的貨（${[...resultCustomers].join('、')}），這不常見，確定混裝？`, run: doAdd });
    else void run(doAdd, '已加入箱', '加入失敗');
  };

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

      {/* 分頁列（仿單據殼） */}
      <div className="flex gap-1 border-b border-border">
        <button type="button" onClick={() => setTab('list')} className={cx('border-b-2 px-4 py-2 text-sm font-medium', tab === 'list' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>包裹列表 <span className="tabular-nums">{allBoxes.length}</span></button>
        <button type="button" disabled={!box} onClick={() => box && setTab('detail')} className={cx('border-b-2 px-4 py-2 text-sm font-medium disabled:opacity-40', tab === 'detail' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>包裹明細{box ? `（${box.docNo}）` : ''}</button>
      </div>

      {err ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">{msg}</div> : null}

      {loading ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">載入中…</div>
      ) : tab === 'list' ? (
        <>
          {/* 新箱 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">開新箱：</span>
            {(['P', 'C', 'D'] as const).map((t) => (
              <button key={t} type="button" disabled={busy || !warehouseId} onClick={() => void createAndOpen(t)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/5 px-3 text-sm font-medium text-primary disabled:opacity-30">
                <PackagePlus className="h-4 w-4" aria-hidden />{TYPE_LABEL[t]}箱</button>
            ))}
            {!warehouseId ? <span className="text-xs text-muted-foreground">（沒有撿好待包的貨、無法建箱）</span> : null}
          </div>

          {/* 包裹列表 */}
          {allBoxes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">還沒有建箱中的包裹。上面開一個新箱、再進去加貨。</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">單號</th>
                    <th className="px-3 py-2 text-left font-medium">出貨方式</th>
                    <th className="px-3 py-2 text-right font-medium">項數</th>
                    <th className="px-3 py-2 text-left font-medium">客戶</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {allBoxes.map((b) => (
                    <tr key={b.plId} onClick={() => openBox(b.plId)} className="cursor-pointer border-t border-border/60 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-foreground">{b.docNo}</td>
                      <td className="px-3 py-2"><span className={cx('rounded px-1.5 py-0.5 text-[10px]', TYPE_TONE[b.plType])}>{TYPE_LABEL[b.plType]}</span></td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{b.lineCount}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {b.mixedCustomer ? <span className="inline-flex items-center gap-0.5 text-amber-600"><Users className="h-3 w-3" aria-hidden />混 {b.customerCount} 客戶</span> : (b.lines[0]?.customerName ?? '空箱')}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-primary">進明細 →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : box ? (
        <div className="space-y-4">
          {/* 明細頭 */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setTab('list')} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-sm text-muted-foreground hover:bg-muted/30"><ArrowLeft className="h-4 w-4" aria-hidden />列表</button>
            <span className="font-mono text-base text-foreground">{box.docNo}</span>
            <span className={cx('rounded px-1.5 py-0.5 text-[10px]', TYPE_TONE[box.plType])}>{TYPE_LABEL[box.plType]}</span>
            {box.mixedCustomer ? <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-600"><Users className="h-3 w-3" aria-hidden />混 {box.customerCount} 客戶</span> : null}
            <div className="ml-auto flex gap-2">
              <button type="button" disabled={busy || box.lineCount === 0} onClick={() => void run(() => sealPacking(box.plId).then(() => getPackWorkspace({ search: search.trim() || undefined })), '已封箱', '封箱失敗', { toList: true })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white disabled:opacity-30"><PackageCheck className="h-4 w-4" aria-hidden />封箱</button>
              <button type="button" disabled={busy} onClick={() => setConfirm({ message: `丟棄箱 ${box.docNo}？箱內 ${box.lineCount} 項貨會退回已撿池。`, run: () => discardBox(box.plId), back: true })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:text-destructive disabled:opacity-40"><Trash2 className="h-4 w-4" aria-hidden />丟棄</button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 箱內容 */}
            <div>
              <div className="mb-2 text-sm font-semibold text-foreground">箱內貨 <span className="text-xs font-normal text-muted-foreground">{box.lineCount} 項</span></div>
              {box.lines.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">空箱、從右邊加貨</div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  {box.lines.map((l) => (
                    <div key={l.plItemId} className="flex items-center gap-2 border-t border-border/60 px-3 py-2 first:border-t-0">
                      <span className="truncate font-mono text-sm text-foreground">{l.partNo}</span>
                      <span className="shrink-0 text-sm text-primary tabular-nums">×{l.qty}</span>
                      <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">{l.customerName} · {l.soDocNo}</span>
                      <button type="button" disabled={busy} onClick={() => void run(() => removeFromBox(box.plId, l.pkItemId), '已退回已撿池', '移出失敗')} aria-label="移出" className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-40"><X className="h-4 w-4" aria-hidden /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 加貨：同出貨方式的已撿池 */}
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                可加入的貨（{TYPE_LABEL[box.plType]}）
                <button type="button" disabled={busy || sel.size === 0} onClick={addSelected} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-primary/50 bg-primary/5 px-3 text-xs font-medium text-primary disabled:opacity-30">加入選取 {sel.size > 0 ? `(${sel.size})` : ''}</button>
              </div>
              {poolForBox.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">沒有{TYPE_LABEL[box.plType]}的已撿貨可加</div>
              ) : (
                <div className="space-y-2">
                  {poolForBox.map((so) => {
                    const ids = so.lines.map((l) => l.pkItemId);
                    const allSel = ids.every((id) => sel.has(id));
                    return (
                      <div key={so.soId} className="overflow-hidden rounded-lg border border-border bg-card">
                        <button type="button" onClick={() => toggleSo(ids)} className={cx('flex w-full items-center gap-2 border-b border-border/60 px-2.5 py-1.5 text-left', allSel ? 'bg-primary/10' : 'bg-muted/30')}>
                          <input type="checkbox" checked={allSel} readOnly className="h-3.5 w-3.5 accent-primary" />
                          <span className="truncate text-xs font-medium text-foreground">{so.customerName}</span>
                          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{so.soDocNo}</span>
                        </button>
                        {so.lines.map((l) => (
                          <button key={l.pkItemId} type="button" onClick={() => toggleLine(l.pkItemId)} className={cx('flex w-full items-center gap-2 px-2.5 py-1.5 text-left', sel.has(l.pkItemId) ? 'bg-primary/5' : 'hover:bg-muted/20')}>
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
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">請從包裹列表選一個箱</div>
      )}

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
            <p className="text-sm text-foreground">{confirm.message}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground">取消</button>
              <button type="button" disabled={busy} onClick={() => { const c = confirm; setConfirm(null); void run(c.run, '已完成', '操作失敗', c.back ? { toList: true } : undefined); }} className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-40">確定</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
