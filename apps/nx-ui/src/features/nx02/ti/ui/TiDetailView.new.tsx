// apps/nx-ui/src/features/nx02/ti/ui/TiDetailView.new.tsx
// NX02-TI-SHELL：同行調貨單詳情面板（比照 RrDetailView.new 模板：左右兩塊 + 三狀態工作列）
//   TI 專屬：狀態流（發出→同行回覆→轉進貨(待驗收)→已完成(RR 過帳自動回寫)）、
//   明細=量價編輯（同行回價回填）+ 草稿可移除行（連動來源銷貨行退回待補）、
//   來源追蹤（每行顯示來源銷貨單號、表頭列關聯進貨單）；⛔ 不能加行/不能建單。
//   帳務：TI 不立應付、轉出的進貨單過帳時認列（執行長拍板「帳跟貨走」）。
'use client';

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Send,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { DocPrintView, printMoney } from '@/features/shared/doc-shell/DocPrintView';

import { getTi, patchTiItem, removeTiItem, tiToRr, updateTi, voidTi } from '@data/endpoints/nx02/ti/api/ti';
import { listLocation } from '@data/endpoints/shared/master/location/api/location';
import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';
import type { Ti, TiItem } from '@data/types/nx02/ti';
import { TI_STATUS_LABEL } from '@data/types/nx02/ti';
import { RR_STATUS_LABEL } from '@data/types/nx02/rr';

const fmt = (n: string | number | null | undefined) =>
  Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

type LocOpt = { id: string; code: string };

async function loadLocs(warehouseId: string): Promise<LocOpt[]> {
  try {
    const res = await listLocation({ page: 1, pageSize: 200, warehouseId, isActive: true });
    return res.items.map((l) => ({ id: l.id, code: l.code }));
  } catch {
    return [];
  }
}

export function TiDetailPanel({
  id,
  onChanged,
  itemIndex,
  itemTotal,
  onPrevItem,
  onNextItem,
  onJumpFirst,
  onJumpLast,
  onCreate,
  onSearch,
  initialMode = 'browse',
}: {
  id: string;
  onChanged?: () => void;
  itemIndex?: number;
  itemTotal?: number;
  onPrevItem?: () => void;
  onNextItem?: () => void;
  onJumpFirst?: () => void;
  onJumpLast?: () => void;
  onCreate?: () => void;
  onSearch?: () => void;
  initialMode?: 'browse' | 'editHeader' | 'editItems';
}) {
  const router = useRouter();
  const [ti, setTi] = useState<Ti | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selItem, setSelItem] = useState<string | null>(null);
  const [toRrOpen, setToRrOpen] = useState(false);
  const [locs, setLocs] = useState<LocOpt[]>([]);

  // 表頭可編欄位（D/S/R）
  const [tiDate, setTiDate] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTi(await getTi(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const reloadAll = useCallback(async () => {
    await reload();
    onChanged?.();
  }, [reload, onChanged]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!ti) return;
    setTiDate(ti.tiDate.slice(0, 10));
    setTaxRate(String(Number(ti.taxRate) || 0));
    setRemark(ti.remark ?? '');
  }, [ti?.id, ti?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ti?.warehouseId) return;
    void loadLocs(ti.warehouseId).then(setLocs);
  }, [ti?.warehouseId]);

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

  // 明細預設選第一列
  useEffect(() => {
    const its = ti?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [ti, selItem]);

  // 明細 ↑↓ 選列
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (toRrOpen || printOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = ti?.items ?? [];
      if (!its.length) return;
      const idx = its.findIndex((i) => i.id === selItem);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const n = its[Math.min(its.length - 1, idx < 0 ? 0 : idx + 1)];
        if (n) setSelItem(n.id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const n = its[Math.max(0, idx < 0 ? 0 : idx - 1)];
        if (n) setSelItem(n.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ti, selItem, toRrOpen, printOpen]);

  // 編輯明細 Alt 快捷
  useEffect(() => {
    if (mode !== 'editItems') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingItemId) {
        e.preventDefault();
        setEditingItemId(null);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const map: Record<string, () => void> = {
        e: () => {
          if (selItem) setEditingItemId(selItem);
        },
        d: () => void removeSelectedItem(),
        s: () => {
          setEditingItemId(null);
          setMode('browse');
        },
        c: () => {
          setEditingItemId(null);
          setMode('browse');
        },
      };
      const fn = map[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, editingItemId, selItem]);

  useEffect(() => {
    if (mode !== 'editItems') setEditingItemId(null);
  }, [mode]);

  useEffect(() => {
    if (!selItem) return;
    document.querySelector(`[data-item-id="${selItem}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selItem]);

  const handle = async (fn: () => Promise<unknown>, prefix: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reloadAll();
    } catch (e) {
      setError(`${prefix}: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !ti) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !ti) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!ti) return null;

  const s = ti.status;
  const editable = s === 'DRAFT' || s === 'SENT' || s === 'REPLIED';
  const headerEditing = mode === 'editHeader' && editable;
  const itemsEditing = mode === 'editItems' && editable;
  const canSend = s === 'DRAFT';
  const canReply = s === 'DRAFT' || s === 'SENT';
  const canToRr = editable && (ti.items?.length ?? 0) > 0;
  const canVoid = editable;

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateTi(id, { tiDate, taxRate: Number(taxRate) || 0, remark });
      setMode('editItems');
      await reloadAll();
    } catch (e) {
      setError(`存檔: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (ti) {
      setTiDate(ti.tiDate.slice(0, 10));
      setTaxRate(String(Number(ti.taxRate) || 0));
      setRemark(ti.remark ?? '');
    }
    setMode('browse');
  }

  async function removeSelectedItem() {
    if (ti!.status !== 'DRAFT') {
      alert('僅草稿可移除明細（會連動來源銷貨行退回待補）');
      return;
    }
    if (!selItem) {
      alert('請先選一筆明細');
      return;
    }
    if (!window.confirm('移除選中的明細項目？（來源銷貨缺貨行會退回「待補」）')) return;
    try {
      await removeTiItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
  }

  function doSend() {
    if (!window.confirm('發出調貨需求給同行？（可搭配電話/LINE 通知）')) return;
    void handle(() => updateTi(id, { status: 'SENT' }), '發出');
  }
  function doReply() {
    if (!window.confirm('標記「同行已回覆」？（回覆的量價請在編輯明細逐行回填）')) return;
    void handle(() => updateTi(id, { status: 'REPLIED' }), '同行回覆');
  }
  function doVoid() {
    if (!window.confirm(`作廢同行調貨單 ${ti!.docNo}？\n（來源銷貨缺貨行會退回「待補」、可重新找別家同行調）`)) return;
    void handle(() => voidTi(id), '作廢');
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60';
  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-foreground';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ToolbarPortal>
        <div data-nx-frame className="flex items-center gap-1 border-b border-border/40 px-3 py-2" style={TOOLBAR_STYLE}>
          {mode === 'browse' ? (
            <>
              <NavButton icon={ChevronsLeft} disabled={!onJumpFirst || (itemIndex ?? 1) <= 1} onClick={onJumpFirst} title="第一筆" />
              <NavButton icon={ChevronLeft} disabled={!onPrevItem || (itemIndex ?? 1) <= 1} onClick={onPrevItem} title="上一筆" />
              <span className="min-w-[3rem] px-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
                {itemIndex ?? '-'} / {itemTotal ?? '-'}
              </span>
              <NavButton icon={ChevronRight} disabled={!onNextItem || (itemTotal !== undefined && (itemIndex ?? 0) >= itemTotal)} onClick={onNextItem} title="下一筆" />
              <NavButton icon={ChevronsRight} disabled={!onJumpLast || (itemTotal !== undefined && (itemIndex ?? 0) >= itemTotal)} onClick={onJumpLast} title="最後一筆" />
              <ToolbarSeparator />
              <ToolbarButton icon={Plus} letter="A" label="新增" enabled={!!onCreate} onClick={onCreate} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={editable && !busy} onClick={() => setMode('editHeader')} />
              <ToolbarButton icon={Trash2} letter="D" label="作廢" enabled={canVoid && !busy} variant="danger" onClick={doVoid} />
              <ToolbarSeparator />
              {canSend ? <ToolbarButton icon={Send} letter="G" label="發出" enabled={!busy} onClick={doSend} /> : null}
              {canReply ? <ToolbarButton icon={CheckCircle2} label="同行回覆" enabled={!busy} onClick={doReply} /> : null}
              {canToRr ? <ToolbarButton icon={Truck} letter="I" label="轉進貨" enabled={!busy} accent onClick={() => setToRrOpen(true)} /> : null}
              <ToolbarSeparator />
              <ToolbarButton icon={Search} letter="F" label="查詢" enabled={!!onSearch} onClick={onSearch} />
              <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={() => void reload()} />
              <ToolbarButton icon={Printer} letter="P" label="列印" enabled onClick={() => setPrintOpen(true)} />
              <ToolbarButton icon={Download} letter="O" label="匯出" enabled onClick={() => setPrintOpen(true)} />
            </>
          ) : mode === 'editHeader' ? (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => void saveHeader()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={cancelEdit} />
            </>
          ) : (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => setMode('browse')} />
              <ToolbarButton icon={Pencil} letter="E" label="回填量價" enabled={itemsEditing && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) setEditingItemId(selItem); }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditing && s === 'DRAFT' && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
          {mode === 'browse' && s === 'PENDING_RECEIPT' ? (
            <span className="px-1 text-[11px] text-amber-600">⚠ 待驗收：進貨單過帳後本單自動完成、銷貨缺貨行自動補貨完成</span>
          ) : null}
        </div>
      </ToolbarPortal>

      {printOpen && ti ? <TiPrintSheet doc={ti} onClose={() => setPrintOpen(false)} /> : null}

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form + 關聯進貨單 */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[420px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <FieldRow label="單號"><input readOnly value={ti.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={TI_STATUS_LABEL[s] ?? s} className={roCls} /></FieldRow>
          <FieldRow label="調貨日期"><input type="date" value={tiDate} onChange={(e) => setTiDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="同行編號"><input readOnly value={ti.partnerCode ?? ti.partnerId} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="同行名稱"><input readOnly value={ti.partnerName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="入庫倉庫"><input readOnly value={ti.warehouseName ? `${ti.warehouseCode ?? ''}　${ti.warehouseName}` : ti.warehouseId} className={roCls} /></FieldRow>
          <FieldRow label="來源詢價單"><input readOnly value={ti.rfqDocNo ?? '—'} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="幣別"><input readOnly value={ti.currencyId} className={roCls} /></FieldRow>
          <FieldRow label="稅率 %"><input type="number" min="0" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="建單人員"><input readOnly value={ti.createdByName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={ti.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!headerEditing} rows={3} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>
          {(ti.relatedRrs?.length ?? 0) > 0 ? (
            <div className="rounded border border-border/40 bg-muted/20 p-2">
              <div className="mb-1 text-xs text-muted-foreground">關聯進貨單：</div>
              <div className="space-y-0.5">
                {ti.relatedRrs!.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <Link href={`/dashboard/purchase/rr/${encodeURIComponent(r.id)}`} className="font-mono text-primary hover:underline">{r.docNo}</Link>
                    <span className="text-muted-foreground">{RR_STATUS_LABEL[r.status] ?? r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* 右：明細 */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity ${mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''}`}>
          <TiItemsTable
            items={ti.items ?? []}
            locs={locs}
            subtotal={ti.subtotal}
            taxAmount={ti.taxAmount}
            totalAmount={ti.totalAmount}
            taxRate={Number(ti.taxRate) || 0}
            editable={itemsEditing}
            allowRemove={itemsEditing && s === 'DRAFT'}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
            onRemoveItem={async (itemId) => {
              if (!window.confirm('移除明細？（來源銷貨缺貨行會退回「待補」）')) return;
              try {
                await removeTiItem(id, itemId);
                await reloadAll();
              } catch (e) {
                alert(e instanceof Error ? e.message : '刪除失敗');
              }
            }}
            editingItemId={itemsEditing ? editingItemId : null}
            renderEditRow={(it) => (
              <TiInlineEditRow tiId={ti.id} locs={locs} editItem={it} onSaved={reloadAll} onExit={() => setEditingItemId(null)} />
            )}
          />
        </section>
      </div>

      {toRrOpen ? (
        <TiToRrDialog
          ti={ti}
          onClose={() => setToRrOpen(false)}
          onDone={(rrId) => {
            setToRrOpen(false);
            router.push(`/dashboard/purchase/rr/${encodeURIComponent(rrId)}`);
          }}
        />
      ) : null}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">{label}：</span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

/** 內嵌明細編輯列：數量 / 單價（同行回價回填）/ 庫位 / 備註（料號鎖定）。Enter 存檔、Esc 退出。 */
function TiInlineEditRow({
  tiId,
  locs,
  editItem,
  onSaved,
  onExit,
}: {
  tiId: string;
  locs: LocOpt[];
  editItem: TiItem;
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const [qty, setQty] = useState(String(editItem.qty));
  const [cost, setCost] = useState(String(editItem.unitCost));
  const [loc, setLoc] = useState(editItem.locationId ?? '');
  const [rmk, setRmk] = useState(editItem.remark ?? '');
  const [busy, setBusy] = useState(false);
  const costRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    costRef.current?.focus();
  }, []);

  const commit = async () => {
    if (busy) return;
    if (Number(qty) <= 0) return;
    setBusy(true);
    try {
      await patchTiItem(tiId, editItem.id, {
        qty: Number(qty),
        unitPriceSnapshot: Number(cost) || 0,
        locationId: loc || null,
        remark: rmk.trim() || null,
      });
      await onSaved();
      onExit();
    } catch (e) {
      alert(e instanceof Error ? e.message : '修改失敗');
    } finally {
      setBusy(false);
    }
  };

  const cell = 'w-full rounded border border-primary/40 bg-background px-2 py-1 text-sm';
  const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
  const enterCommit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    }
  };
  const lineAmount = (Number(qty) || 0) * (Number(cost) || 0);

  return (
    <tr
      className="bg-amber-400/10"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onExit();
        }
      }}
    >
      <td className="px-3 py-1 text-xs text-primary">{editItem.lineNo}</td>
      <td className="px-2 py-1" colSpan={2}>
        <span className="font-mono text-xs">{editItem.partNo}　{editItem.partName}</span>
      </td>
      <td className="px-2 py-1 text-xs text-muted-foreground">{editItem.sourceSoDocNo ?? '—'}</td>
      <td className="px-2 py-1">
        <select value={loc} onChange={(e) => setLoc(e.target.value)} className={cell} disabled={busy}>
          <option value="">— 庫位 —</option>
          {locs.map((l) => (
            <option key={l.id} value={l.id}>{l.code}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1">
        <input type="number" min="0" step="1" value={qty} onFocus={selectAll} onChange={(e) => setQty(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
      </td>
      <td className="px-2 py-1">
        <input ref={costRef} type="number" min="0" step="0.01" value={cost} onFocus={selectAll} onChange={(e) => setCost(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
      </td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineAmount)}</td>
      <td className="px-2 py-1">
        <input value={rmk} onChange={(e) => setRmk(e.target.value)} onKeyDown={enterCommit} placeholder="備註" className={`${cell} text-xs`} />
      </td>
      <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">Enter↵ / Esc</td>
    </tr>
  );
}

/** TI 明細表（純呈現）：料號(+廠牌小字)/品名/來源銷貨單/庫位/數量/單價/金額/備註 */
function TiItemsTable({
  items,
  locs,
  subtotal,
  taxAmount,
  totalAmount,
  taxRate,
  editable,
  allowRemove,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  editingItemId,
  renderEditRow,
}: {
  items: TiItem[];
  locs: LocOpt[];
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  taxRate: number;
  editable: boolean;
  allowRemove: boolean;
  selectedItemId: string | null;
  onSelectItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  editingItemId?: string | null;
  renderEditRow?: (it: TiItem) => React.ReactNode;
}) {
  const colCount = editable ? 10 : 9;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitRows, setFitRows] = useState(12);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ROW = 37;
    const calc = () => setFitRows(Math.max(0, Math.floor((el.clientHeight - 38 - 42) / ROW)));
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pad = Math.max(0, fitRows - items.length);
  const locCode = (idv: string | null) => (idv ? locs.find((l) => l.id === idv)?.code ?? idv : '—');
  return (
    <div ref={scrollRef} className="flex-1 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-border/60 [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border/60">
        <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">序號</th>
            <th className="px-3 py-2 text-left">料號</th>
            <th className="px-3 py-2 text-left">品名</th>
            <th className="px-3 py-2 text-left">來源銷貨單</th>
            <th className="px-3 py-2 text-left">庫位</th>
            <th className="px-3 py-2 text-right">數量</th>
            <th className="px-3 py-2 text-right">單價</th>
            <th className="px-3 py-2 text-right">金額</th>
            <th className="px-3 py-2 text-left">備註</th>
            {editable ? <th className="px-3 py-2"></th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            if (editingItemId && it.id === editingItemId && renderEditRow) {
              return <Fragment key={it.id}>{renderEditRow(it)}</Fragment>;
            }
            const sel = it.id === selectedItemId;
            const noPrice = Number(it.unitCost) === 0;
            return (
              <tr
                key={it.id}
                data-item-id={it.id}
                onClick={() => onSelectItem?.(it.id)}
                className={`cursor-pointer ${
                  sel ? 'bg-[var(--primary)]/15 shadow-[inset_3px_0_0_var(--primary)]' : `${i % 2 === 1 ? 'bg-foreground/[0.04]' : 'bg-card'} hover:bg-accent/15`
                }`}
              >
                <td className="px-3 py-2 text-xs text-muted-foreground">{it.lineNo}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  <div>{it.partNo}</div>
                  {it.secCode ? <div className="mt-0.5 text-[10px] text-muted-foreground" title="廠牌料號">{it.secCode}</div> : null}
                </td>
                <td className="px-3 py-2">{it.partName}</td>
                <td className="px-3 py-2 font-mono text-xs">{it.sourceSoDocNo ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{locCode(it.locationId)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(it.qty)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {noPrice ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">待回價</span> : fmt(it.unitCost)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(it.lineAmount)}</td>
                <td className="px-3 py-2 text-xs">{it.remark ?? ''}</td>
                {editable ? (
                  <td className="px-3 py-2 text-right">
                    {allowRemove ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem?.(it.id);
                        }}
                        className="text-xs text-rose-700 hover:underline"
                      >
                        刪除
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
          {Array.from({ length: pad }).map((_, i) => (
            <tr key={`ph_${i}`} aria-hidden className={(items.length + i) % 2 === 1 ? 'bg-foreground/[0.04]' : 'bg-card'}>
              {Array.from({ length: colCount }).map((__, j) => (
                <td key={j} className="px-3 py-2">&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 border-t border-border/60 bg-muted text-sm">
          <tr>
            <td className="px-3 py-2 text-right" colSpan={colCount}>
              <span className="text-xs text-muted-foreground">未稅 </span>
              <span className="font-medium tabular-nums">{fmt(subtotal)}</span>
              <span className="ml-4 text-xs text-muted-foreground">稅額({taxRate}%) </span>
              <span className="tabular-nums">{fmt(taxAmount)}</span>
              <span className="ml-4 text-xs text-muted-foreground">總計 </span>
              <span className="text-base font-semibold tabular-nums">{fmt(totalAmount)}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** 轉進貨對話框：收貨倉（預設=單頭入庫倉）+ 勾行/收量/庫位 → tiToRr → 跳進貨單詳情 */
function TiToRrDialog({
  ti,
  onClose,
  onDone,
}: {
  ti: Ti;
  onClose: () => void;
  onDone: (rrId: string) => void;
}) {
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState(ti.warehouseId);
  const [locs, setLocs] = useState<LocOpt[]>([]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set((ti.items ?? []).map((it) => it.id)));
  const [qtys, setQtys] = useState<Record<string, string>>(() => {
    const q: Record<string, string> = {};
    (ti.items ?? []).forEach((it) => {
      q[it.id] = String(Number(it.qty));
    });
    return q;
  });
  const [lineLocs, setLineLocs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listWarehouses({ page: 1, pageSize: 200, isActive: true });
        setWarehouses(res.items.map((w) => ({ id: w.id, code: w.code, name: w.name })));
      } catch {
        /* 撈不到不擋 */
      }
    })();
  }, []);

  useEffect(() => {
    if (!warehouseId) {
      setLocs([]);
      setLineLocs({});
      return;
    }
    void loadLocs(warehouseId).then((ls) => {
      setLocs(ls);
      // 預設帶 TI 行既有庫位（同倉才有效）
      const next: Record<string, string> = {};
      (ti.items ?? []).forEach((it) => {
        if (it.locationId && ls.some((l) => l.id === it.locationId)) next[it.id] = it.locationId;
      });
      setLineLocs(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  async function doConvert() {
    setErr(null);
    if (!warehouseId) {
      setErr('請先選收貨倉庫');
      return;
    }
    const rows = (ti.items ?? [])
      .filter((it) => checked.has(it.id))
      .map((it) => ({ tiItemId: it.id, qty: Number(qtys[it.id]) || 0, locationId: lineLocs[it.id] || '' }))
      .filter((r) => r.qty > 0);
    if (!rows.length) {
      setErr('請至少勾一行且收量 > 0');
      return;
    }
    if (rows.some((r) => !r.locationId)) {
      setErr('每一行都要選入庫庫位');
      return;
    }
    setBusy(true);
    try {
      const created = await tiToRr(ti.id, { warehouseId, items: rows });
      onDone(created.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '轉進貨失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">轉進貨　<span className="font-mono text-muted-foreground">{ti.docNo}</span></h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉"><X className="h-4 w-4" /></button>
        </div>
        {err ? <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{err}</div> : null}
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">收貨倉庫：</span>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="rounded border bg-background px-2 py-1 text-sm">
            <option value="">— 選倉庫 —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code}　{w.name}</option>
            ))}
          </select>
          <span className="text-[11px] text-muted-foreground">（應付帳款由進貨單過帳認列；過帳後本單自動完成）</span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2 text-left">料號</th>
                <th className="px-2 py-2 text-left">品名</th>
                <th className="px-2 py-2 text-right">調貨量</th>
                <th className="px-2 py-2 text-right">本次收量</th>
                <th className="px-2 py-2 text-left">入庫庫位</th>
                <th className="px-2 py-2 text-right">單價</th>
              </tr>
            </thead>
            <tbody>
              {(ti.items ?? []).map((it) => (
                <tr key={it.id} className="hover:bg-accent/10">
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={checked.has(it.id)}
                      onChange={() =>
                        setChecked((prev) => {
                          const n = new Set(prev);
                          if (n.has(it.id)) n.delete(it.id);
                          else n.add(it.id);
                          return n;
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 font-mono text-xs">{it.partNo}</td>
                  <td className="px-2 py-1.5">{it.partName}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{Number(it.qty)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      min="0"
                      max={Number(it.qty)}
                      step="1"
                      value={qtys[it.id] ?? ''}
                      onChange={(e) => setQtys((p) => ({ ...p, [it.id]: e.target.value }))}
                      className="w-20 rounded border bg-background px-2 py-0.5 text-right text-sm tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      disabled={!warehouseId}
                      value={lineLocs[it.id] ?? ''}
                      onChange={(e) => setLineLocs((p) => ({ ...p, [it.id]: e.target.value }))}
                      className="rounded border bg-background px-1 py-0.5 text-xs"
                    >
                      <option value="">— 庫位 —</option>
                      {locs.map((l) => (
                        <option key={l.id} value={l.id}>{l.code}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmt(it.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">建立草稿進貨單後會跳轉到該單走驗收/過帳；收量不可超過調貨量。</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button type="button" disabled={busy || checked.size === 0} onClick={() => void doConvert()} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? '建立中…' : `轉進貨 ${checked.size} 行`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 新增面板＝導引（TI 不能憑空建單、明細必回鏈客戶訂單） */
export function TiCreatePanel({ onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ToolbarPortal>
        <div data-nx-frame className="flex items-center gap-1 border-b border-border/40 px-3 py-2" style={TOOLBAR_STYLE}>
          <ToolbarButton icon={X} letter="C" label="返回" enabled onClick={onCancel} />
          <div className="flex-1" />
          <span className="px-1 text-[11px] text-muted-foreground">新增同行調貨單</span>
        </div>
      </ToolbarPortal>
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="max-w-xl space-y-4 rounded-lg border border-border/40 bg-card p-6 text-sm">
          <h2 className="text-base font-semibold">同行調貨單不能憑空建立</h2>
          <p className="text-muted-foreground">
            每一行調貨明細都必須對應一筆客戶訂單的缺貨行（跟同行調貨永遠是為了出貨給客戶）。請從以下兩個入口建立：
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <span className="font-medium">銷貨單缺貨行</span>——到{' '}
              <Link href="/dashboard/sale/so" className="text-primary underline">銷貨單</Link>{' '}
              詳情、工具列「同行調貨」：勾缺貨行＋選同行 → 一鍵建單。
            </li>
            <li>
              <span className="font-medium">詢價比價採用</span>——到{' '}
              <Link href="/dashboard/purchase/rfq" className="text-primary underline">詢價單</Link>{' '}
              比價區「採用」同行報價：系統自動建單（含回價）。
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/** NX-DOC-PRINT：同行調貨單列印設定（DocPrintView 皮） */
function TiPrintSheet({ doc, onClose }: { doc: Ti; onClose: () => void }) {
  return (
    <DocPrintView
      title="同　行　調　貨　單"
      docNo={doc.docNo}
      fields={[
        { label: '單號', value: doc.docNo },
        { label: '調貨日期', value: doc.tiDate.slice(0, 10) },
        { label: '同行編號', value: doc.partnerCode ?? '' },
        { label: '同行名稱', value: doc.partnerName ?? '' },
        { label: '入庫倉庫', value: doc.warehouseName ?? '' },
        { label: '來源詢價單', value: doc.rfqDocNo ?? '' },
        { label: '幣別 / 稅率', value: `${doc.currencyId} / ${Number(doc.taxRate)}%` },
        { label: '建單人員', value: doc.createdByName ?? '' },
      ]}
      columns={[
        { label: '序', width: '6%', align: 'center', render: (it) => it.lineNo },
        { label: '料號', width: '18%', render: (it) => <span className="font-mono">{it.partNo}</span> },
        { label: '品名', render: (it) => it.partName },
        { label: '數量', width: '8%', align: 'right', render: (it) => Number(it.qty) },
        { label: '單價', width: '11%', align: 'right', render: (it) => printMoney(it.unitCost) },
        { label: '金額', width: '12%', align: 'right', render: (it) => printMoney(it.lineAmount) },
        { label: '備註', width: '14%', render: (it) => it.remark ?? '' },
      ]}
      items={doc.items ?? []}
      getRowKey={(it) => it.id}
      totals={[
        { label: '未稅金額', value: printMoney(doc.subtotal) },
        { label: `稅額（${Number(doc.taxRate)}%）`, value: printMoney(doc.taxAmount) },
        { label: '總計', value: printMoney(doc.totalAmount), strong: true },
      ]}
      note={doc.remark}
      signatures={['製單', '主管', '同行確認']}
      onClose={onClose}
    />
  );
}
