// apps/nx-ui/src/features/nx02/pr/ui/PrDetailView.new.tsx
// NX02-PR-SHELL：進貨退回詳情面板（比照 SrDetailView.new 模板：左右兩塊 + 三狀態工作列）
//   PR 專屬：三態流（草稿→過帳/作廢）、退貨類型 F/P/A（A=折讓不退不扣庫存）、
//   處置 G/B/W（W=過帳每行自動建保固申請單、不立應收）、明細只能從來源進貨單帶入（rrItemId 必填）。
//   建單：挑「已過帳」進貨單 → 倉庫/供應商自動帶 → 勾行+退量+原因 → createPr
//   （🔎 修舊 PrNewForm bug：來源進貨單下拉用舊狀態碼 'P' + 讀 .data 錯位、清單永遠是空的）
'use client';

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileClock,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';

import {
  addPrItem,
  createPr,
  getPr,
  patchPrItem,
  removePrItem,
  updatePr,
  voidPr,
} from '@data/endpoints/nx02/pr/api/pr';
import { getRr, listRr } from '@data/endpoints/nx02/rr/api/rr';
import { listLocation } from '@data/endpoints/shared/master/location/api/location';
import type { Rr, RrItem } from '@data/types/nx02/rr';
import type { Pr, PrItem } from '@data/types/nx02/pr';
import { DISPOSITION_LABEL, PR_REASON_LABEL, PR_STATUS_LABEL, RETURN_MODE_LABEL } from '@data/types/nx02/pr';

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

/** 過帳確認文案：依 退貨類型 × 處置 組合說清楚帳務後果 */
function postConfirmText(pr: Pr): string {
  const stock = pr.returnMode === 'A' ? '不扣庫存（折讓不退、貨留原倉）' : '依明細扣庫存';
  const money =
    pr.dispositionFlag === 'W'
      ? '不立應收、每行自動建保固申請單'
      : pr.returnMode === 'A'
        ? '寫進貨折讓沖應付'
        : '立應收（向廠商要回貨款）';
  return `過帳？（${stock}、${money}；過帳後不可再改）`;
}

export function PrDetailPanel({
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
  const [pr, setPr] = useState<Pr | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [addOpen, setAddOpen] = useState(false); // 從進貨單帶入（PR 明細唯一來源）
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selItem, setSelItem] = useState<string | null>(null);
  const [locs, setLocs] = useState<LocOpt[]>([]);

  // 表頭可編欄位（DRAFT）
  const [prDate, setPrDate] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [returnMode, setReturnMode] = useState('P');
  const [dispositionFlag, setDispositionFlag] = useState('G');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPr(await getPr(id));
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
    if (!pr) return;
    setPrDate(pr.prDate.slice(0, 10));
    setTaxRate(String(Number(pr.taxRate) || 0));
    setReturnMode(pr.returnMode ?? 'P');
    setDispositionFlag(pr.dispositionFlag ?? 'G');
    setRemark(pr.remark ?? '');
  }, [pr?.id, pr?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pr?.warehouseId) return;
    void loadLocs(pr.warehouseId).then(setLocs);
  }, [pr?.warehouseId]);

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

  // 明細預設選第一列
  useEffect(() => {
    const its = pr?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [pr, selItem]);

  // 明細 ↑↓ 選列
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (addOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = pr?.items ?? [];
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
  }, [pr, selItem, addOpen]);

  // 編輯明細 Alt 快捷
  useEffect(() => {
    if (mode !== 'editItems') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (addOpen || editingItemId)) {
        e.preventDefault();
        setAddOpen(false);
        setEditingItemId(null);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const map: Record<string, () => void> = {
        a: () => {
          setEditingItemId(null);
          setAddOpen(true);
        },
        e: () => {
          if (selItem) {
            setAddOpen(false);
            setEditingItemId(selItem);
          }
        },
        d: () => void removeSelectedItem(),
        s: () => {
          setAddOpen(false);
          setEditingItemId(null);
          setMode('browse');
        },
        c: () => {
          setAddOpen(false);
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
  }, [mode, addOpen, editingItemId, selItem]);

  useEffect(() => {
    if (mode !== 'editItems') {
      setAddOpen(false);
      setEditingItemId(null);
    }
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

  if (loading && !pr) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !pr) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!pr) return null;

  const s = pr.status;
  const editable = s === 'DRAFT';
  const headerEditing = mode === 'editHeader' && editable;
  const itemsEditing = mode === 'editItems' && editable;
  const canPost = s === 'DRAFT' && (pr.items?.length ?? 0) > 0;
  const canVoid = s === 'DRAFT';

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updatePr(id, {
        prDate,
        taxRate: Number(taxRate) || 0,
        remark,
        returnMode: returnMode as 'F' | 'P' | 'A',
        dispositionFlag: dispositionFlag as 'G' | 'B' | 'W',
      });
      setMode('editItems');
      await reloadAll();
    } catch (e) {
      setError(`存檔: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (pr) {
      setPrDate(pr.prDate.slice(0, 10));
      setTaxRate(String(Number(pr.taxRate) || 0));
      setReturnMode(pr.returnMode ?? 'P');
      setDispositionFlag(pr.dispositionFlag ?? 'G');
      setRemark(pr.remark ?? '');
    }
    setMode('browse');
  }

  async function removeSelectedItem() {
    if (!selItem) {
      alert('請先選一筆明細');
      return;
    }
    if (!window.confirm('移除選中的明細項目？')) return;
    try {
      await removePrItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
  }

  function doPost() {
    if (!window.confirm(postConfirmText(pr!))) return;
    void handle(() => updatePr(id, { status: 'POSTED' }), '過帳');
  }
  function doVoid() {
    if (!window.confirm(`作廢進貨退回單 ${pr!.docNo}？`)) return;
    void handle(() => voidPr(id), '作廢');
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
              <ToolbarButton icon={CheckCircle2} letter="T" label="過帳" enabled={canPost && !busy} accent onClick={doPost} />
              <ToolbarSeparator />
              <ToolbarButton icon={Search} letter="F" label="查詢" enabled={!!onSearch} onClick={onSearch} />
              <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={() => void reload()} />
              <ToolbarButton icon={Printer} letter="P" label="列印" enabled onClick={() => alert('列印開發中')} />
              <ToolbarButton icon={Download} letter="O" label="匯出" enabled onClick={() => alert('匯出開發中')} />
            </>
          ) : mode === 'editHeader' ? (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => void saveHeader()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={cancelEdit} />
            </>
          ) : (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => setMode('browse')} />
              <ToolbarButton icon={FileClock} letter="A" label="從進貨單帶入" enabled={itemsEditing && !!pr.rrId} pressed={addOpen} onClick={() => { setEditingItemId(null); setAddOpen(true); }} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯項目" enabled={itemsEditing && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) { setAddOpen(false); setEditingItemId(selItem); } }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditing && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
          {mode === 'browse' && s === 'DRAFT' && pr.dispositionFlag === 'W' ? (
            <span className="px-1 text-[11px] text-amber-600">⚠ 走保固：過帳每行自動建保固申請單、不立應收</span>
          ) : mode === 'browse' && s === 'DRAFT' && pr.returnMode === 'A' ? (
            <span className="px-1 text-[11px] text-amber-600">⚠ 折讓不退：過帳不扣庫存、寫進貨折讓沖應付</span>
          ) : null}
        </div>
      </ToolbarPortal>

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[420px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <FieldRow label="單號"><input readOnly value={pr.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={PR_STATUS_LABEL[s] ?? s} className={roCls} /></FieldRow>
          <FieldRow label="退回日期"><input type="date" value={prDate} onChange={(e) => setPrDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="供應商編號"><input readOnly value={pr.supplierCode ?? pr.supplierId} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="供應商名稱"><input readOnly value={pr.supplierName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="來源進貨單"><input readOnly value={pr.rrDocNo ?? '—'} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="退回倉庫"><input readOnly value={pr.warehouseName ? `${pr.warehouseCode ?? ''}　${pr.warehouseName}` : (pr.warehouseCode ?? pr.warehouseId)} className={roCls} /></FieldRow>
          <FieldRow label="退貨類型">
            {headerEditing ? (
              <select value={returnMode} onChange={(e) => setReturnMode(e.target.value)} className={inputCls}>
                <option value="F">F 全部退</option>
                <option value="P">P 部分退</option>
                <option value="A">A 折讓不退（貨留、不扣庫存）</option>
              </select>
            ) : (
              <input readOnly value={pr.returnMode ? RETURN_MODE_LABEL[pr.returnMode] ?? pr.returnMode : '—'} className={roCls} />
            )}
          </FieldRow>
          <FieldRow label="退貨處置">
            {headerEditing ? (
              <select value={dispositionFlag} onChange={(e) => setDispositionFlag(e.target.value)} className={inputCls}>
                <option value="G">G 一般退</option>
                <option value="B">B 壞品退</option>
                <option value="W">W 走保固（過帳自動建保固單）</option>
              </select>
            ) : (
              <input readOnly value={pr.dispositionFlag ? DISPOSITION_LABEL[pr.dispositionFlag] ?? pr.dispositionFlag : '—'} className={roCls} />
            )}
          </FieldRow>
          <FieldRow label="幣別"><input readOnly value={pr.currencyId} className={roCls} /></FieldRow>
          <FieldRow label="稅率 %"><input type="number" min="0" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="建單人員"><input readOnly value={pr.createdByName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={pr.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          {pr.postedAt ? <FieldRow label="過帳時間"><input readOnly value={pr.postedAt.slice(0, 10)} className={roCls} /></FieldRow> : null}
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!headerEditing} rows={3} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>
        </section>

        {/* 右：明細 */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity ${mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''}`}>
          <PrItemsTable
            items={pr.items ?? []}
            locs={locs}
            subtotal={pr.subtotal}
            taxAmount={pr.taxAmount}
            totalAmount={pr.totalAmount}
            taxRate={Number(pr.taxRate) || 0}
            editable={itemsEditing}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
            onRemoveItem={async (itemId) => {
              try {
                await removePrItem(id, itemId);
                await reloadAll();
              } catch (e) {
                alert(e instanceof Error ? e.message : '刪除失敗');
              }
            }}
            editingItemId={itemsEditing ? editingItemId : null}
            renderEditRow={(it) => (
              <PrInlineEditRow prId={pr.id} locs={locs} editItem={it} onSaved={reloadAll} onExit={() => setEditingItemId(null)} />
            )}
          />
        </section>
      </div>

      {addOpen && pr.rrId ? (
        <RrLineAddDialog
          rrId={pr.rrId}
          prDocNo={pr.docNo}
          existing={pr.items ?? []}
          onClose={() => setAddOpen(false)}
          onConfirm={async (rows) => {
            setAddOpen(false);
            try {
              for (const r of rows) {
                await addPrItem(pr.id, r);
              }
              await reloadAll();
            } catch (e) {
              alert(e instanceof Error ? e.message : '帶入失敗');
              await reloadAll();
            }
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

/** 內嵌明細編輯列：數量 / 單價 / 庫位 / 備註（料號鎖定）。Enter 存檔、Esc 退出。 */
function PrInlineEditRow({
  prId,
  locs,
  editItem,
  onSaved,
  onExit,
}: {
  prId: string;
  locs: LocOpt[];
  editItem: PrItem;
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const [qty, setQty] = useState(String(editItem.qty));
  const [cost, setCost] = useState(String(editItem.unitCost));
  const [loc, setLoc] = useState(editItem.locationId ?? '');
  const [rmk, setRmk] = useState(editItem.remark ?? '');
  const [busy, setBusy] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    qtyRef.current?.focus();
  }, []);

  const commit = async () => {
    if (busy) return;
    if (Number(qty) <= 0) {
      qtyRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await patchPrItem(prId, editItem.id, {
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
      <td className="px-2 py-1">
        <select value={loc} onChange={(e) => setLoc(e.target.value)} className={cell} disabled={busy}>
          <option value="">— 庫位 —</option>
          {locs.map((l) => (
            <option key={l.id} value={l.id}>{l.code}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1">
        <input ref={qtyRef} type="number" min="0" step="1" value={qty} onFocus={selectAll} onChange={(e) => setQty(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
      </td>
      <td className="px-2 py-1">
        <input type="number" min="0" step="0.01" value={cost} onFocus={selectAll} onChange={(e) => setCost(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
      </td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineAmount)}</td>
      <td className="px-2 py-1 text-xs text-muted-foreground">{editItem.returnReason ? PR_REASON_LABEL[editItem.returnReason] ?? editItem.returnReason : '—'}</td>
      <td className="px-2 py-1">
        <input value={rmk} onChange={(e) => setRmk(e.target.value)} onKeyDown={enterCommit} placeholder="備註" className={`${cell} text-xs`} />
      </td>
      <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">Enter↵ / Esc</td>
    </tr>
  );
}

/** PR 明細表（純呈現）：料號/品名/庫位/數量/單價/金額/原因/備註 */
function PrItemsTable({
  items,
  locs,
  subtotal,
  taxAmount,
  totalAmount,
  taxRate,
  editable,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  editingItemId,
  renderEditRow,
}: {
  items: PrItem[];
  locs: LocOpt[];
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  taxRate: number;
  editable: boolean;
  selectedItemId: string | null;
  onSelectItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  editingItemId?: string | null;
  renderEditRow?: (it: PrItem) => React.ReactNode;
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
            <th className="px-3 py-2 text-left">庫位</th>
            <th className="px-3 py-2 text-right">退量</th>
            <th className="px-3 py-2 text-right">單價</th>
            <th className="px-3 py-2 text-right">金額</th>
            <th className="px-3 py-2 text-left">原因</th>
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
                <td className="px-3 py-2 font-mono text-xs">{it.partNo}</td>
                <td className="px-3 py-2">{it.partName}</td>
                <td className="px-3 py-2 font-mono text-xs">{locCode(it.locationId)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(it.qty)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(it.unitCost)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(it.lineAmount)}</td>
                <td className="px-3 py-2 text-xs">{it.returnReason ? PR_REASON_LABEL[it.returnReason] ?? it.returnReason : '—'}</td>
                <td className="px-3 py-2 text-xs">{it.remark ?? ''}</td>
                {editable ? (
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!window.confirm(`刪除明細 ${it.lineNo}？`)) return;
                        onRemoveItem?.(it.id);
                      }}
                      className="text-xs text-rose-700 hover:underline"
                    >
                      刪除
                    </button>
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

/** 從來源進貨單帶入退貨明細：列該 RR 全部行、勾選＋退量＋原因（已帶入的行標示） */
function RrLineAddDialog({
  rrId,
  prDocNo,
  existing,
  onClose,
  onConfirm,
}: {
  rrId: string;
  prDocNo: string;
  existing: PrItem[];
  onClose: () => void;
  onConfirm: (rows: { rrItemId: string; partId: string; qty: number; unitPriceSnapshot: number; locationId?: string; returnReason?: string }[]) => void | Promise<void>;
}) {
  const [rr, setRr] = useState<Rr | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const already = new Set(existing.map((it) => it.rrItemId));

  useEffect(() => {
    void (async () => {
      try {
        const d = await getRr(rrId);
        setRr(d);
        const q: Record<string, string> = {};
        const rs: Record<string, string> = {};
        (d.items ?? []).forEach((it) => {
          q[it.id] = String(Number(it.actualQty ?? it.qty));
          rs[it.id] = 'D';
        });
        setQtys(q);
        setReasons(rs);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [rrId]);

  const toggle = (itemId: string) =>
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(itemId)) n.delete(itemId);
      else n.add(itemId);
      return n;
    });

  const items: RrItem[] = rr?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            從進貨單帶入退貨明細　<span className="font-mono text-muted-foreground">{rr?.docNo ?? ''}</span>
            <span className="ml-2 text-xs text-muted-foreground">→ {prDocNo}</span>
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉"><X className="h-4 w-4" /></button>
        </div>
        {err ? <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{err}</div> : null}
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">載入中…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">來源進貨單無明細。</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-left">料號</th>
                  <th className="px-2 py-2 text-left">品名</th>
                  <th className="px-2 py-2 text-right">進貨量</th>
                  <th className="px-2 py-2 text-right">退量</th>
                  <th className="px-2 py-2 text-left">退貨原因</th>
                  <th className="px-2 py-2 text-right">單價</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const dup = already.has(it.id);
                  return (
                    <tr key={it.id} className={dup ? 'opacity-40' : 'hover:bg-accent/10'}>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" disabled={dup} checked={checked.has(it.id)} onChange={() => toggle(it.id)} title={dup ? '已帶入本單' : undefined} />
                      </td>
                      <td className="cursor-pointer px-2 py-1.5 font-mono text-xs" onClick={() => !dup && toggle(it.id)}>{it.partNo}</td>
                      <td className="cursor-pointer px-2 py-1.5" onClick={() => !dup && toggle(it.id)}>{it.partName}{dup ? <span className="ml-2 text-[10px] text-muted-foreground">（已帶入）</span> : null}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{Number(it.actualQty ?? it.qty)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          disabled={dup}
                          value={qtys[it.id] ?? ''}
                          onChange={(e) => setQtys((p) => ({ ...p, [it.id]: e.target.value }))}
                          className="w-20 rounded border bg-background px-2 py-0.5 text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          disabled={dup}
                          value={reasons[it.id] ?? 'D'}
                          onChange={(e) => setReasons((p) => ({ ...p, [it.id]: e.target.value }))}
                          className="rounded border bg-background px-1 py-0.5 text-xs"
                        >
                          {Object.entries(PR_REASON_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>{k} {v}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{fmt(it.unitCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">退量預設＝實收量；庫位沿用進貨行原庫位。</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button
            type="button"
            disabled={checked.size === 0}
            onClick={() =>
              void onConfirm(
                items
                  .filter((it) => checked.has(it.id) && !already.has(it.id))
                  .map((it) => ({
                    rrItemId: it.id,
                    partId: it.partId,
                    qty: Number(qtys[it.id]) || 0,
                    unitPriceSnapshot: Number(it.unitCost) || 0,
                    locationId: it.locationId || undefined,
                    returnReason: reasons[it.id] ?? 'D',
                  }))
                  .filter((r) => r.qty > 0),
              )
            }
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            帶入 {checked.size} 行
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 新增進貨退回面板（內嵌）：挑「已過帳」進貨單 → 倉庫/供應商自動帶 → 退貨類型/處置 → 勾行+退量+原因 → createPr
 * 🔎 修舊 PrNewForm bug：來源進貨單下拉用舊狀態碼 'P' + 讀 .data 錯位、清單永遠是空的
 */
export function PrCreatePanel({
  onCreated,
  onCancel,
  initialRrId,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
  /** ?rr= 入口：預載來源進貨單（沿舊 PrNewForm 參數） */
  initialRrId?: string;
}) {
  const [rr, setRr] = useState<Rr | null>(null);
  const [prDate, setPrDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnMode, setReturnMode] = useState<'F' | 'P' | 'A'>('P');
  const [dispositionFlag, setDispositionFlag] = useState<'G' | 'B' | 'W'>('G');
  const [remark, setRemark] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ?rr= 入口：自動預載該進貨單
  const initLoadedRef = useRef(false);
  useEffect(() => {
    if (!initialRrId || initLoadedRef.current) return;
    initLoadedRef.current = true;
    void pickRr({ id: initialRrId } as Rr);
  }, [initialRrId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pickRr(row: Rr) {
    setErr(null);
    try {
      const d = await getRr(row.id);
      setRr(d);
      const q: Record<string, string> = {};
      const rs: Record<string, string> = {};
      const c = new Set<string>();
      (d.items ?? []).forEach((it) => {
        q[it.id] = String(Number(it.actualQty ?? it.qty));
        rs[it.id] = 'D';
        c.add(it.id);
      });
      setQtys(q);
      setReasons(rs);
      setChecked(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入進貨單失敗');
    }
  }

  async function doSave() {
    setErr(null);
    if (!rr) {
      setErr('請先選來源進貨單');
      return;
    }
    const rows = (rr.items ?? [])
      .filter((it) => checked.has(it.id))
      .map((it) => ({
        rrItemId: it.id,
        partId: it.partId,
        qty: Number(qtys[it.id]) || 0,
        unitPriceSnapshot: Number(it.unitCost) || 0,
        locationId: it.locationId || undefined,
        returnReason: reasons[it.id] ?? 'D',
      }))
      .filter((r) => r.qty > 0);
    if (!rows.length) {
      setErr('請至少勾一行且退量 > 0');
      return;
    }
    setBusy(true);
    try {
      const created = await createPr({
        prDate,
        warehouseId: rr.warehouseId,
        supplierId: rr.supplierId,
        rrId: rr.id,
        taxRate: Number(rr.taxRate) || 5,
        returnMode,
        dispositionFlag,
        remark: remark.trim() || undefined,
        items: rows,
      });
      onCreated(created.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-muted-foreground';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ToolbarPortal>
        <div data-nx-frame className="flex items-center gap-1 border-b border-border/40 px-3 py-2" style={TOOLBAR_STYLE}>
          <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!!rr && !busy} accent onClick={() => void doSave()} />
          <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={onCancel} />
          <div className="flex-1" />
          <span className="px-1 text-[11px] text-muted-foreground">新增進貨退回單</span>
        </div>
      </ToolbarPortal>

      {err ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號"><input readOnly value="存檔後產生" className={roCls} /></FieldRow>
          <FieldRow label="來源進貨單"><RrPickerInput onPick={(r) => void pickRr(r)} /></FieldRow>
          <FieldRow label="供應商"><input readOnly value={rr ? `${rr.supplierCode ?? ''}　${rr.supplierName ?? ''}` : ''} className={roCls} /></FieldRow>
          <FieldRow label="退回倉庫"><input readOnly value={rr ? (rr.warehouseName ? `${rr.warehouseCode ?? ''}　${rr.warehouseName}` : rr.warehouseId) : ''} className={roCls} /></FieldRow>
          <FieldRow label="退回日期"><input type="date" value={prDate} onChange={(e) => setPrDate(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="退貨類型">
            <select value={returnMode} onChange={(e) => setReturnMode(e.target.value as 'F' | 'P' | 'A')} className={inputCls}>
              <option value="F">F 全部退</option>
              <option value="P">P 部分退</option>
              <option value="A">A 折讓不退（貨留、不扣庫存）</option>
            </select>
          </FieldRow>
          <FieldRow label="退貨處置">
            <select value={dispositionFlag} onChange={(e) => setDispositionFlag(e.target.value as 'G' | 'B' | 'W')} className={inputCls}>
              <option value="G">G 一般退</option>
              <option value="B">B 壞品退</option>
              <option value="W">W 走保固（過帳自動建保固單）</option>
            </select>
          </FieldRow>
          <FieldRow label="備註"><input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} /></FieldRow>
          <p className="pt-1 text-[11px] text-muted-foreground">來源限「已過帳」進貨單；右側勾要退的行、退量預設＝實收量。</p>
        </section>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-border">
          {rr ? (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-left">料號</th>
                  <th className="px-2 py-2 text-left">品名</th>
                  <th className="px-2 py-2 text-right">進貨量</th>
                  <th className="px-2 py-2 text-right">退量</th>
                  <th className="px-2 py-2 text-left">退貨原因</th>
                  <th className="px-2 py-2 text-right">單價</th>
                </tr>
              </thead>
              <tbody>
                {(rr.items ?? []).map((it) => (
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
                    <td className="px-2 py-1.5 text-right tabular-nums">{Number(it.actualQty ?? it.qty)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={qtys[it.id] ?? ''}
                        onChange={(e) => setQtys((p) => ({ ...p, [it.id]: e.target.value }))}
                        className="w-20 rounded border bg-background px-2 py-0.5 text-right text-sm tabular-nums"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={reasons[it.id] ?? 'D'}
                        onChange={(e) => setReasons((p) => ({ ...p, [it.id]: e.target.value }))}
                        className="rounded border bg-background px-1 py-0.5 text-xs"
                      >
                        {Object.entries(PR_REASON_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{k} {v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(it.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">先選來源進貨單，這裡會列出可退的進貨明細。</div>
          )}
        </section>
      </div>
    </div>
  );
}

/** 來源進貨單 picker：關鍵字（單號/供應商）下拉、限已過帳（POSTED） */
function RrPickerInput({ onPick }: { onPick: (row: Rr) => void }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Rr[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (kw: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          const resp = await listRr({ pageSize: 20, status: 'POSTED', search: kw.trim() || undefined });
          setRows(resp.items);
          setOpen(true);
          setHi(0);
        } catch {
          /* ignore */
        }
      })();
    }, 250);
  };

  const pick = (r: Rr) => {
    setText(`${r.docNo}　${r.supplierName ?? ''}`);
    setOpen(false);
    onPick(r);
  };

  return (
    <div className="relative">
      <input
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          search(e.target.value);
        }}
        onFocus={() => {
          if (!rows.length) search('');
        }}
        onKeyDown={(e) => {
          if (!open || !rows.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHi((h) => Math.min(rows.length - 1, h + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => Math.max(0, h - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const r = rows[hi];
            if (r) pick(r);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="輸入進貨單號 / 供應商關鍵字"
        className="w-full rounded border bg-background px-2 py-1 font-mono text-sm"
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-[28rem] max-w-[80vw] overflow-auto rounded border border-border bg-card shadow-xl">
          {rows.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">無可退的進貨單（限已過帳）</div>
          ) : (
            rows.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
                className={`block w-full px-3 py-1.5 text-left text-xs ${i === hi ? 'bg-primary/15' : 'hover:bg-accent/10'}`}
              >
                <span className="font-mono">{r.docNo}</span>　{r.supplierName ?? r.supplierId}
                <span className="ml-2 text-muted-foreground">{r.rrDate.slice(0, 10)} · {fmt(r.totalAmount)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
