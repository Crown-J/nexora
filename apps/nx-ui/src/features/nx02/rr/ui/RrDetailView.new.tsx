// apps/nx-ui/src/features/nx02/rr/ui/RrDetailView.new.tsx
// NX02-RR-SHELL：進貨單詳情面板（比照 SrDetailView.new 模板：左右兩塊 + 三狀態工作列）
//   RR 專屬：狀態動作（送驗收/過帳(寫庫存+應付)/駁回/作廢）、明細雙來源（從採購單帶入 + 手動加行）、
//   明細編輯=數量/實收/瑕疵/批號/保固/單價（DRAFT+INSPECTING；庫位建行後不可改、PatchRrItemDto 無此欄）。
//   新增面板雙路徑：從採購單建立（poToRr、勾行+庫位）/ 手動建立（供應商+倉庫+首行明細、後端 create 要求至少 1 行）。
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
  Send,
  Tags,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { DocPrintView, printMoney } from '@/features/shared/doc-shell/DocPrintView';
// 偉盟 P2 2.6 Step 2 2026-07-11：進貨明細條碼標籤批次列印（收貨貼標場景）
import { LabelPrintSheet, type LabelData } from '@/features/shared/part-barcode/LabelPrintSheet';
import { fetchDefaultBarcodes } from '@data/endpoints/nx01/part-barcode/api/part-barcode';
import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';

import {
  addRrItem,
  createRr,
  getRr,
  patchRrItem,
  removeRrItem,
  updateRr,
  voidRr,
} from '@data/endpoints/nx02/rr/api/rr';
import { getPo, poToRr } from '@data/endpoints/nx02/po/api/po';
import { getRfq } from '@data/endpoints/nx02/rfq/api/rfq';
import type { Rfq } from '@data/types/nx02/rfq';
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { listLocation } from '@data/endpoints/shared/master/location/api/location';
import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';
import type { Po } from '@data/types/nx02/po';
import type { Rr, RrItem } from '@data/types/nx02/rr';
import { DEFECT_TYPE_LABEL, RR_STATUS_LABEL } from '@data/types/nx02/rr';

const fmt = (n: string | number | null | undefined) =>
  Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

type LocOpt = { id: string; code: string };

/** 載入某倉全部啟用庫位（下拉用、200 上限足夠單倉；比照 StDetailView） */
async function loadLocs(warehouseId: string): Promise<LocOpt[]> {
  try {
    const res = await listLocation({ page: 1, pageSize: 200, warehouseId, isActive: true });
    return res.items.map((l) => ({ id: l.id, code: l.code }));
  } catch {
    return [];
  }
}

/** 採購單簡表列（picker 用）。舊 listPo client 回傳鍵錯位（rows vs data）、這裡直接打 API 容錯讀 */
type PoPickRow = { id: string; docNo: string; poDate: string; supplierName: string | null; status: string; itemCount?: number };
const PO_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  SUBMITTED: '已送審',
  APPROVED: '已核准',
  CONFIRMED: '廠商確認',
  PARTIAL_RECEIVED: '部分到貨',
  RECEIVED: '已到貨',
  CLOSED: '結案',
  CANCELLED: '已取消',
};
/** 可收貨的採購單狀態（前端建議性過濾；後端 toRr 以剩餘可收量把關） */
const PO_RECEIVABLE = ['APPROVED', 'CONFIRMED', 'PARTIAL_RECEIVED'];

async function listReceivablePo(search: string): Promise<PoPickRow[]> {
  const q = buildQueryString({ page: '1', pageSize: '30', search: search.trim() || undefined });
  const res = await apiFetch(`/nx02/po${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_rr_po_pick_001');
  const body = (await res.json()) as { rows?: PoPickRow[]; items?: PoPickRow[] };
  const rows = body.rows ?? body.items ?? [];
  return rows.filter((r) => PO_RECEIVABLE.includes(r.status));
}

export function RrDetailPanel({
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
  const [rr, setRr] = useState<Rr | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  // 偉盟 P2 2.6 Step 2：明細條碼標籤批次列印（每料 × 實收量、預設條碼 fallback 料號）
  const [labelData, setLabelData] = useState<LabelData[] | null>(null);
  const [labelBusy, setLabelBusy] = useState(false);

  async function openLabelPrint() {
    const items = rr?.items ?? [];
    if (!items.length) return;
    setLabelBusy(true);
    try {
      const res = await fetchDefaultBarcodes([...new Set(items.map((it) => it.partId))]);
      const map = new Map(res.rows.map((r) => [r.partId, r.barcode]));
      const MAX_LABELS = 500;
      const labels: LabelData[] = [];
      for (const it of items) {
        const qty = Math.max(1, Math.round(Number(it.actualQty ?? it.qty) || 1));
        for (let i = 0; i < qty && labels.length < MAX_LABELS; i++) {
          labels.push({ barcode: map.get(it.partId) ?? it.partNo, partNo: it.partNo, partName: it.partName });
        }
        if (labels.length >= MAX_LABELS) break;
      }
      if (labels.length >= MAX_LABELS) alert(`標籤已達單次上限 ${MAX_LABELS} 張、超出部分請分批印`);
      setLabelData(labels);
    } catch (e) {
      alert(e instanceof Error ? e.message : '取條碼對照失敗');
    } finally {
      setLabelBusy(false);
    }
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [addOpen, setAddOpen] = useState(false); // 從採購單帶入
  const [manualAdd, setManualAdd] = useState(false); // 手動加行（PartPicker）
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selItem, setSelItem] = useState<string | null>(null);
  const [locs, setLocs] = useState<LocOpt[]>([]);

  // 表頭可編欄位（updateRr 支援：rrDate / taxRate / remark / deliveryOrderNo）
  const [rrDate, setRrDate] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [deliveryOrderNo, setDeliveryOrderNo] = useState('');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRr(await getRr(id));
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
    if (!rr) return;
    setRrDate(rr.rrDate.slice(0, 10));
    setTaxRate(String(Number(rr.taxRate) || 0));
    setDeliveryOrderNo(rr.deliveryOrderNo ?? '');
    setRemark(rr.remark ?? '');
  }, [rr?.id, rr?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // 庫位（依單頭倉庫、編輯明細/帶入對話框用）
  useEffect(() => {
    if (!rr?.warehouseId) return;
    void loadLocs(rr.warehouseId).then(setLocs);
  }, [rr?.warehouseId]);

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

  // 建單後（initialMode=editItems）→ 有來源採購單自動開帶入、否則開手動加行
  const autoAddRef = useRef(false);
  useEffect(() => {
    if (initialMode === 'editItems' && rr && !autoAddRef.current) {
      autoAddRef.current = true;
      if (rr.poId) setAddOpen(true);
    }
  }, [rr, initialMode]);

  // 明細預設選第一列
  useEffect(() => {
    const its = rr?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [rr, selItem]);

  // 明細 ↑↓ 選列
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (addOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = rr?.items ?? [];
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
  }, [rr, selItem, addOpen]);

  // 編輯明細 Alt 快捷
  useEffect(() => {
    if (mode !== 'editItems') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (addOpen || manualAdd || editingItemId)) {
        e.preventDefault();
        setAddOpen(false);
        setManualAdd(false);
        setEditingItemId(null);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const map: Record<string, () => void> = {
        a: () => {
          setManualAdd(false);
          setEditingItemId(null);
          setAddOpen(true);
        },
        n: () => {
          setAddOpen(false);
          setEditingItemId(null);
          setManualAdd(true);
        },
        e: () => {
          if (selItem) {
            setAddOpen(false);
            setManualAdd(false);
            setEditingItemId(selItem);
          }
        },
        d: () => void removeSelectedItem(),
        s: () => {
          setAddOpen(false);
          setManualAdd(false);
          setEditingItemId(null);
          setMode('browse');
        },
        c: () => {
          setAddOpen(false);
          setManualAdd(false);
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
  }, [mode, addOpen, manualAdd, editingItemId, selItem]);

  useEffect(() => {
    if (mode !== 'editItems') {
      setAddOpen(false);
      setManualAdd(false);
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

  if (loading && !rr) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !rr) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!rr) return null;

  const statusEditable = rr.status === 'DRAFT' || rr.status === 'INSPECTING';
  const headerEditing = mode === 'editHeader' && statusEditable;
  const itemsEditable = mode === 'editItems' && statusEditable;

  const canSubmit = rr.status === 'DRAFT' && (rr.items?.length ?? 0) > 0;
  const canPost = rr.status === 'INSPECTING';
  const canReject = rr.status === 'INSPECTING';
  const canCancel = rr.status !== 'POSTED' && rr.status !== 'CANCELLED';

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateRr(id, {
        rrDate,
        taxRate: Number(taxRate) || 0,
        remark,
        deliveryOrderNo: deliveryOrderNo.trim() || null,
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
    if (rr) {
      setRrDate(rr.rrDate.slice(0, 10));
      setTaxRate(String(Number(rr.taxRate) || 0));
      setDeliveryOrderNo(rr.deliveryOrderNo ?? '');
      setRemark(rr.remark ?? '');
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
      await removeRrItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
  }

  function doSubmit() {
    if (!window.confirm('送驗收？（交由倉管收貨檢驗）')) return;
    void handle(() => updateRr(id, { status: 'INSPECTING' }), '送驗收');
  }
  function doPost() {
    if (!window.confirm('過帳？（依實收量寫入庫存、並自動立應付帳款，過帳後不可再改）')) return;
    void handle(() => updateRr(id, { status: 'POSTED' }), '過帳');
  }
  function doReject() {
    if (!window.confirm('駁回此進貨單？（退回採購處理）')) return;
    void handle(() => updateRr(id, { status: 'REJECTED' }), '駁回');
  }
  function doCancel() {
    if (!window.confirm(`作廢進貨單 ${rr!.docNo}？`)) return;
    void handle(() => voidRr(id), '作廢');
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60';
  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-foreground';
  const sourceDoc = rr.poDocNo ?? rr.tiDocNo ?? rr.rfqDocNo;

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
              <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={statusEditable && !busy} onClick={() => setMode('editHeader')} />
              <ToolbarButton icon={Trash2} letter="D" label="作廢" enabled={canCancel && !busy} variant="danger" onClick={doCancel} />
              <ToolbarSeparator />
              {/* RR 狀態流：送驗收 / 過帳 / 駁回（依狀態亮） */}
              <ToolbarButton icon={Send} letter="G" label="送驗收" enabled={canSubmit && !busy} onClick={doSubmit} />
              <ToolbarButton icon={CheckCircle2} letter="T" label="過帳" enabled={canPost && !busy} accent onClick={doPost} />
              <ToolbarButton icon={XCircle} label="駁回" enabled={canReject && !busy} variant="danger" onClick={doReject} />
              <ToolbarSeparator />
              <ToolbarButton icon={Search} letter="F" label="查詢" enabled={!!onSearch} onClick={onSearch} />
              <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={() => void reload()} />
              <ToolbarButton icon={Printer} letter="P" label="列印" enabled onClick={() => setPrintOpen(true)} />
              <ToolbarButton icon={Download} letter="O" label="匯出" enabled onClick={() => setPrintOpen(true)} />
              {/* 偉盟 P2 2.6 Step 2：收貨貼標——全明細 × 實收量 一鍵印條碼標籤 */}
              <ToolbarButton icon={Tags} label="印標籤" enabled={!labelBusy && (rr.items?.length ?? 0) > 0} onClick={() => void openLabelPrint()} />
            </>
          ) : mode === 'editHeader' ? (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => void saveHeader()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={cancelEdit} />
            </>
          ) : (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => setMode('browse')} />
              <ToolbarButton icon={FileClock} letter="A" label="從採購單帶入" enabled={itemsEditable && !!rr.poId} pressed={addOpen} onClick={() => { setManualAdd(false); setEditingItemId(null); setAddOpen(true); }} />
              <ToolbarButton icon={Plus} letter="N" label="新增項目" enabled={itemsEditable} pressed={manualAdd} onClick={() => { setAddOpen(false); setEditingItemId(null); setManualAdd(true); }} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯項目" enabled={itemsEditable && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) { setAddOpen(false); setManualAdd(false); setEditingItemId(selItem); } }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditable && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
          {mode === 'browse' && rr.status === 'INSPECTING' ? (
            <span className="px-1 text-[11px] text-amber-600">⚠ 過帳依「實收量」入庫；未填實收視同數量全收</span>
          ) : null}
        </div>
      </ToolbarPortal>

      {printOpen && rr ? <RrPrintSheet doc={rr} locs={locs} onClose={() => setPrintOpen(false)} /> : null}

      {labelData && rr ? (
        <LabelPrintSheet title={`進貨單 ${rr.docNo} 標籤`} labels={labelData} onClose={() => setLabelData(null)} />
      ) : null}

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[420px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <FieldRow label="單號"><input readOnly value={rr.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={RR_STATUS_LABEL[rr.status] ?? rr.status} className={roCls} /></FieldRow>
          <FieldRow label="進貨日期"><input type="date" value={rrDate} onChange={(e) => setRrDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="供應商編號"><input readOnly value={rr.supplierCode ?? rr.supplierId} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="供應商名稱"><input readOnly value={rr.supplierName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="入庫倉庫"><input readOnly value={rr.warehouseName ? `${rr.warehouseCode ?? ''}　${rr.warehouseName}` : (rr.warehouseCode ?? rr.warehouseId)} className={roCls} /></FieldRow>
          <FieldRow label="來源單號"><input readOnly value={sourceDoc ?? '—（無來源、手動建立）'} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="提貨單號"><input value={deliveryOrderNo} onChange={(e) => setDeliveryOrderNo(e.target.value)} disabled={!headerEditing} placeholder="國外進口用（報關行核發）" className={inputCls} /></FieldRow>
          <FieldRow label="幣別"><input readOnly value={rr.currencyId} className={roCls} /></FieldRow>
          <FieldRow label="稅率 %"><input type="number" min="0" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="建單人員"><input readOnly value={rr.createdByName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={rr.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          {rr.postedAt ? <FieldRow label="過帳時間"><input readOnly value={rr.postedAt.slice(0, 10)} className={roCls} /></FieldRow> : null}
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!headerEditing} rows={3} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>
        </section>

        {/* 右：明細 */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity ${mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''}`}>
          <RrItemsTable
            items={rr.items ?? []}
            locs={locs}
            subtotal={rr.subtotal}
            taxAmount={rr.taxAmount}
            totalAmount={rr.totalAmount}
            taxRate={Number(rr.taxRate) || 0}
            editable={itemsEditable}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
            onRemoveItem={async (itemId) => {
              try {
                await removeRrItem(id, itemId);
                await reloadAll();
              } catch (e) {
                alert(e instanceof Error ? e.message : '刪除失敗');
              }
            }}
            editingItemId={itemsEditable ? editingItemId : null}
            renderEditRow={(it) => (
              <RrInlineItemRow
                rrId={rr.id}
                locs={locs}
                editItem={it}
                onSaved={reloadAll}
                onExit={() => setEditingItemId(null)}
              />
            )}
            appendRow={
              itemsEditable && manualAdd ? (
                <RrInlineItemRow
                  rrId={rr.id}
                  locs={locs}
                  onSaved={reloadAll}
                  onExit={() => setManualAdd(false)}
                />
              ) : null
            }
          />
        </section>
      </div>

      {addOpen && rr.poId ? (
        <PoLineAddDialog
          poId={rr.poId}
          rrDocNo={rr.docNo}
          locs={locs}
          onClose={() => setAddOpen(false)}
          onConfirm={async (rows) => {
            setAddOpen(false);
            try {
              for (const r of rows) {
                await addRrItem(rr.id, {
                  partId: r.partId,
                  locationId: r.locationId,
                  qty: r.qty,
                  unitPriceSnapshot: r.unitCost,
                });
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

/**
 * 新增進貨單面板（內嵌）：雙路徑 + 詢價單入口
 *  A 從採購單建立（主路徑）：挑採購單（已核准/廠商確認/部分到貨）→ 收貨倉 → 勾行+收量+庫位 → poToRr
 *  B 手動建立：供應商 + 倉庫 + 首行明細（料號/庫位/數量/單價）→ createRr（後端要求至少 1 行）
 *  C 從詢價單（僅由 RfqDetailView「轉進貨」?rfq= 入口進入）：帶「已回覆且有單價」的行 → createRr(rfqId)
 */
export function RrCreatePanel({
  onCreated,
  onCancel,
  initialRfqId,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
  initialRfqId?: string;
}) {
  const [source, setSource] = useState<'po' | 'manual' | 'rfq'>(initialRfqId ? 'rfq' : 'po');
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [locs, setLocs] = useState<LocOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // A：採購單路徑
  const [po, setPo] = useState<Po | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [lineLocs, setLineLocs] = useState<Record<string, string>>({});

  // C：詢價單路徑（入口驅動）
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [rfqChecked, setRfqChecked] = useState<Set<string>>(new Set());
  const [rfqQtys, setRfqQtys] = useState<Record<string, string>>({});
  const [rfqLocs, setRfqLocs] = useState<Record<string, string>>({});

  // B：手動路徑
  const [supplier, setSupplier] = useState<PickedCustomer | null>(null);
  const [rrDate, setRrDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');
  const [part, setPart] = useState<PickedPart | null>(null);
  const [firstLoc, setFirstLoc] = useState('');
  const [firstQty, setFirstQty] = useState('1');
  const [firstCost, setFirstCost] = useState('');

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
      return;
    }
    void loadLocs(warehouseId).then((ls) => {
      setLocs(ls);
      setFirstLoc((prev) => (ls.some((l) => l.id === prev) ? prev : ''));
      setLineLocs({});
      setRfqLocs({});
    });
  }, [warehouseId]);

  // C：?rfq= 入口 → 載入詢價單、帶「已回覆且有單價」的行
  useEffect(() => {
    if (!initialRfqId) return;
    void (async () => {
      try {
        const d = await getRfq(initialRfqId);
        setRfq(d);
        const q: Record<string, string> = {};
        const c = new Set<string>();
        (d.items ?? []).forEach((it) => {
          if (it.status !== 'R' || it.unitPrice == null) return;
          q[it.id] = String(it.qty);
          c.add(it.id);
        });
        setRfqQtys(q);
        setRfqChecked(c);
        if (!c.size) setErr('此詢價單無「已回覆」且有單價之明細可帶入');
      } catch (e) {
        setErr(e instanceof Error ? e.message : '載入詢價單失敗');
      }
    })();
  }, [initialRfqId]);

  async function pickPo(row: PoPickRow) {
    setErr(null);
    try {
      const detail = await getPo(row.id);
      setPo(detail);
      const q: Record<string, string> = {};
      const c = new Set<string>();
      (detail.items ?? []).forEach((it) => {
        const remain = Number(it.qty) - Number(it.receivedQty || 0) - Number(it.cancelledQty || 0);
        if (remain > 0) {
          q[it.id] = String(remain);
          c.add(it.id);
        }
      });
      setQtys(q);
      setChecked(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入採購單失敗');
    }
  }

  async function doSave() {
    setErr(null);
    if (!warehouseId) {
      setErr('請先選收貨倉庫');
      return;
    }
    setBusy(true);
    try {
      if (source === 'po') {
        if (!po) throw new Error('請先選來源採購單');
        const rows = (po.items ?? [])
          .filter((it) => checked.has(it.id))
          .map((it) => ({ poItemId: it.id, qty: Number(qtys[it.id]) || 0, locationId: lineLocs[it.id] || '' }))
          .filter((r) => r.qty > 0);
        if (!rows.length) throw new Error('請至少勾一行且收量 > 0');
        if (rows.some((r) => !r.locationId)) throw new Error('每一行都要選入庫庫位');
        const created = await poToRr(po.id, { warehouseId, items: rows });
        onCreated(created.id);
      } else if (source === 'rfq') {
        if (!rfq) throw new Error('詢價單載入中');
        if (!rfq.supplierId) throw new Error('此詢價單無供應商、無法轉進貨');
        const rows = (rfq.items ?? [])
          .filter((it) => rfqChecked.has(it.id) && it.status === 'R' && it.unitPrice != null)
          .map((it) => ({
            partId: it.partId,
            locationId: rfqLocs[it.id] || '',
            qty: Number(rfqQtys[it.id]) || 0,
            unitPriceSnapshot: Number(it.unitPrice) || 0,
          }))
          .filter((r) => r.qty > 0);
        if (!rows.length) throw new Error('請至少勾一行且數量 > 0');
        if (rows.some((r) => !r.locationId)) throw new Error('每一行都要選入庫庫位');
        const created = await createRr({
          rrDate,
          warehouseId,
          supplierId: rfq.supplierId,
          rfqId: rfq.id,
          taxRate: Number(taxRate) || 0,
          remark: remark.trim() || undefined,
          items: rows,
        });
        onCreated(created.id);
      } else {
        if (!supplier) throw new Error('請先選供應商');
        if (!part) throw new Error('請選首行明細的料號');
        if (!firstLoc) throw new Error('請選首行明細的庫位');
        if (!(Number(firstQty) > 0)) throw new Error('首行數量須 > 0');
        const created = await createRr({
          rrDate,
          warehouseId,
          supplierId: supplier.id,
          taxRate: Number(taxRate) || 0,
          remark: remark.trim() || undefined,
          items: [
            {
              partId: part.id,
              locationId: firstLoc,
              qty: Number(firstQty),
              unitPriceSnapshot: Number(firstCost) || 0,
            },
          ],
        });
        onCreated(created.id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-muted-foreground';
  const canSave =
    source === 'po' ? !!po && !!warehouseId : source === 'rfq' ? !!rfq && !!warehouseId : !!supplier && !!warehouseId && !!part;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ToolbarPortal>
        <div data-nx-frame className="flex items-center gap-1 border-b border-border/40 px-3 py-2" style={TOOLBAR_STYLE}>
          <ToolbarButton icon={Save} letter="S" label="存檔" enabled={canSave && !busy} accent onClick={() => void doSave()} />
          <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={onCancel} />
          <div className="flex-1" />
          <span className="px-1 text-[11px] text-muted-foreground">新增進貨單</span>
        </div>
      </ToolbarPortal>

      {err ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 */}
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號"><input readOnly value="存檔後產生" className={roCls} /></FieldRow>
          <FieldRow label="建立方式">
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1"><input type="radio" checked={source === 'po'} onChange={() => setSource('po')} />從採購單</label>
              <label className="flex items-center gap-1"><input type="radio" checked={source === 'manual'} onChange={() => setSource('manual')} />手動建立</label>
              {initialRfqId ? (
                <label className="flex items-center gap-1"><input type="radio" checked={source === 'rfq'} onChange={() => setSource('rfq')} />從詢價單</label>
              ) : null}
            </div>
          </FieldRow>
          <FieldRow label="收貨倉庫">
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}>
              <option value="">— 選倉庫 —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code}　{w.name}</option>
              ))}
            </select>
          </FieldRow>
          {source === 'po' ? (
            <>
              <FieldRow label="來源採購單"><PoPickerInput onPick={(r) => void pickPo(r)} /></FieldRow>
              <FieldRow label="供應商"><input readOnly value={po ? `${po.supplierCode ?? ''}　${po.supplierName ?? ''}` : ''} className={roCls} /></FieldRow>
              <p className="pt-1 text-[11px] text-muted-foreground">限「已核准 / 廠商確認 / 部分到貨」的採購單；右側勾要收的行、填收量與庫位。進貨日期＝今天（建單後可改）。</p>
            </>
          ) : source === 'rfq' ? (
            <>
              <FieldRow label="來源詢價單"><input readOnly value={rfq ? rfq.docNo : '載入中…'} className={`${roCls} font-mono`} /></FieldRow>
              <FieldRow label="供應商"><input readOnly value={rfq ? `${rfq.supplierCode ?? ''}　${rfq.supplierName ?? rfq.supplierId ?? ''}` : ''} className={roCls} /></FieldRow>
              <FieldRow label="進貨日期"><input type="date" value={rrDate} onChange={(e) => setRrDate(e.target.value)} className={inputCls} /></FieldRow>
              <FieldRow label="稅率 %"><input type="number" min="0" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={inputCls} /></FieldRow>
              <FieldRow label="備註"><input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} /></FieldRow>
              <p className="pt-1 text-[11px] text-muted-foreground">只帶「已回覆且有單價」的詢價明細；右側勾要進的行、填數量與庫位。</p>
            </>
          ) : (
            <>
              <FieldRow label="供應商"><CustomerPicker gate="PURCHASE" onPick={setSupplier} onCommit={() => {}} /></FieldRow>
              <FieldRow label="進貨日期"><input type="date" value={rrDate} onChange={(e) => setRrDate(e.target.value)} className={inputCls} /></FieldRow>
              <FieldRow label="稅率 %"><input type="number" min="0" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={inputCls} /></FieldRow>
              <FieldRow label="備註"><input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} /></FieldRow>
              <div className="rounded border border-border/40 bg-muted/20 p-2">
                <div className="mb-1 text-xs text-muted-foreground">首行明細（建單至少一行、之後可再加）：</div>
                <div className="space-y-2">
                  <PartPicker onPick={setPart} />
                  <div className="flex gap-2">
                    <select value={firstLoc} onChange={(e) => setFirstLoc(e.target.value)} className={inputCls} disabled={!warehouseId}>
                      <option value="">— 庫位 —</option>
                      {locs.map((l) => (
                        <option key={l.id} value={l.id}>{l.code}</option>
                      ))}
                    </select>
                    <input type="number" min="1" step="1" value={firstQty} onChange={(e) => setFirstQty(e.target.value)} placeholder="數量" className={`${inputCls} text-right`} />
                    <input type="number" min="0" step="0.01" value={firstCost} onChange={(e) => setFirstCost(e.target.value)} placeholder="單價" className={`${inputCls} text-right`} />
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 右：採購單行選擇（A 路徑）/ 空明細（B 路徑） */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-border">
          {source === 'po' && po ? (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-left">料號</th>
                  <th className="px-2 py-2 text-left">品名</th>
                  <th className="px-2 py-2 text-right">訂購量</th>
                  <th className="px-2 py-2 text-right">已收量</th>
                  <th className="px-2 py-2 text-right">本次收量</th>
                  <th className="px-2 py-2 text-left">入庫庫位</th>
                  <th className="px-2 py-2 text-right">單價</th>
                </tr>
              </thead>
              <tbody>
                {(po.items ?? []).map((it) => {
                  const remain = Number(it.qty) - Number(it.receivedQty || 0) - Number(it.cancelledQty || 0);
                  return (
                    <tr key={it.id} className={remain <= 0 ? 'opacity-40' : 'hover:bg-accent/10'}>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          disabled={remain <= 0}
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
                      <td className="px-2 py-1.5 font-mono text-[14px]">{it.partNo}</td>
                      <td className="px-2 py-1.5">{it.partName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{it.qty}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{Number(it.receivedQty || 0)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          max={remain}
                          step="1"
                          disabled={remain <= 0}
                          value={qtys[it.id] ?? ''}
                          onChange={(e) => setQtys((p) => ({ ...p, [it.id]: e.target.value }))}
                          className="w-20 rounded border bg-background px-2 py-0.5 text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          disabled={remain <= 0 || !warehouseId}
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
                  );
                })}
              </tbody>
            </table>
          ) : source === 'rfq' && rfq ? (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-left">料號</th>
                  <th className="px-2 py-2 text-left">品名</th>
                  <th className="px-2 py-2 text-right">詢價量</th>
                  <th className="px-2 py-2 text-right">本次進量</th>
                  <th className="px-2 py-2 text-left">入庫庫位</th>
                  <th className="px-2 py-2 text-right">回覆單價</th>
                </tr>
              </thead>
              <tbody>
                {(rfq.items ?? []).map((it) => {
                  const usable = it.status === 'R' && it.unitPrice != null;
                  return (
                    <tr key={it.id} className={usable ? 'hover:bg-accent/10' : 'opacity-40'}>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          disabled={!usable}
                          checked={rfqChecked.has(it.id)}
                          onChange={() =>
                            setRfqChecked((prev) => {
                              const n = new Set(prev);
                              if (n.has(it.id)) n.delete(it.id);
                              else n.add(it.id);
                              return n;
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[14px]">{it.partNo}</td>
                      <td className="px-2 py-1.5">{it.partName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{it.qty}</td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          disabled={!usable}
                          value={rfqQtys[it.id] ?? ''}
                          onChange={(e) => setRfqQtys((p) => ({ ...p, [it.id]: e.target.value }))}
                          className="w-20 rounded border bg-background px-2 py-0.5 text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          disabled={!usable || !warehouseId}
                          value={rfqLocs[it.id] ?? ''}
                          onChange={(e) => setRfqLocs((p) => ({ ...p, [it.id]: e.target.value }))}
                          className="rounded border bg-background px-1 py-0.5 text-xs"
                        >
                          <option value="">— 庫位 —</option>
                          {locs.map((l) => (
                            <option key={l.id} value={l.id}>{l.code}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{it.unitPrice != null ? fmt(it.unitPrice) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              {source === 'po'
                ? '先選收貨倉庫與來源採購單，這裡會列出可收的採購明細。'
                : source === 'rfq'
                  ? '詢價單載入中…'
                  : '手動建立：左側填供應商與首行明細，存檔後進入明細編輯可繼續加行。'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** 來源採購單 picker：關鍵字（單號）下拉、限可收狀態（已核准/廠商確認/部分到貨） */
function PoPickerInput({ onPick }: { onPick: (row: PoPickRow) => void }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PoPickRow[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (kw: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          const list = await listReceivablePo(kw);
          setRows(list);
          setOpen(true);
          setHi(0);
        } catch {
          /* ignore */
        }
      })();
    }, 250);
  };

  const pick = (r: PoPickRow) => {
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
        placeholder="輸入採購單號關鍵字"
        className="w-full rounded border bg-background px-2 py-1 font-mono text-sm"
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-[28rem] max-w-[80vw] overflow-auto rounded border border-border bg-card shadow-xl">
          {rows.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">無可收貨的採購單（限已核准/廠商確認/部分到貨）</div>
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
                <span className="font-mono">{r.docNo}</span>　{r.supplierName ?? ''}
                <span className="ml-2 text-muted-foreground">{r.poDate?.slice(0, 10)} · {PO_STATUS_LABEL[r.status] ?? r.status}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 內嵌明細列（新增 + 編輯共用；比照 StDetailView 的加行範式）
 *  新增（無 editItem）：料號 picker + 庫位 + 數量 + 單價 → addRrItem
 *  編輯（有 editItem）：數量/實收/瑕疵(量+類型)/單價/批號/保固（料號與庫位鎖定、Patch DTO 無庫位）
 *  Enter 存檔、Esc 退出。
 */
function RrInlineItemRow({
  rrId,
  locs,
  editItem,
  onSaved,
  onExit,
}: {
  rrId: string;
  locs: LocOpt[];
  editItem?: RrItem;
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const [part, setPart] = useState<PickedPart | null>(null);
  const [loc, setLoc] = useState(editItem?.locationId ?? '');
  const [qty, setQty] = useState(String(editItem?.qty ?? '1'));
  const [cost, setCost] = useState(String(editItem?.unitCost ?? ''));
  const [actualQty, setActualQty] = useState(editItem?.actualQty != null ? String(editItem.actualQty) : '');
  const [defectQty, setDefectQty] = useState(editItem?.defectQty != null ? String(editItem.defectQty) : '');
  const [defectType, setDefectType] = useState(editItem?.defectType ?? '');
  const [batchNo, setBatchNo] = useState(editItem?.batchNo ?? '');
  const [warranty, setWarranty] = useState(editItem?.warrantyExpiredAt?.slice(0, 10) ?? '');
  const [busy, setBusy] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);
  const partRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editItem) qtyRef.current?.focus();
    else partRef.current?.focus();
  }, [editItem]);

  const commit = async () => {
    if (Number(qty) <= 0) {
      qtyRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (editItem) {
        await patchRrItem(rrId, editItem.id, {
          qty: Number(qty),
          unitPriceSnapshot: Number(cost) || 0,
          actualQty: actualQty.trim() === '' ? null : Number(actualQty),
          defectQty: defectQty.trim() === '' ? 0 : Number(defectQty),
          defectType: defectType ? (defectType as 'D' | 'F' | 'W' | 'O') : null,
          batchNo: batchNo.trim() || null,
          warrantyExpiredAt: warranty || null,
        });
        await onSaved();
        onExit();
      } else {
        if (!part) {
          partRef.current?.focus();
          setBusy(false);
          return;
        }
        if (!loc) {
          alert('請選庫位');
          setBusy(false);
          return;
        }
        await addRrItem(rrId, {
          partId: part.id,
          locationId: loc,
          qty: Number(qty),
          unitPriceSnapshot: Number(cost) || 0,
        });
        await onSaved();
        onExit();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : editItem ? '修改失敗' : '新增失敗');
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
      <td className="px-3 py-1 text-xs text-primary">{editItem ? editItem.lineNo : '＋'}</td>
      <td className="px-2 py-1" colSpan={2}>
        {editItem ? (
          <span className="font-mono text-[14px]">{editItem.partNo}　{editItem.partName}</span>
        ) : (
          <PartPicker inputRef={partRef} onPick={setPart} />
        )}
      </td>
      <td className="px-2 py-1">
        {editItem ? (
          <span className="font-mono text-[14px]">{locs.find((l) => l.id === editItem.locationId)?.code ?? editItem.locationId}</span>
        ) : (
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className={cell} disabled={busy}>
            <option value="">— 庫位 —</option>
            {locs.map((l) => (
              <option key={l.id} value={l.id}>{l.code}</option>
            ))}
          </select>
        )}
      </td>
      <td className="px-2 py-1">
        <input ref={qtyRef} type="number" min="0" step="1" value={qty} onFocus={selectAll} onChange={(e) => setQty(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
      </td>
      <td className="px-2 py-1">
        {editItem ? (
          <input type="number" min="0" step="1" value={actualQty} onFocus={selectAll} onChange={(e) => setActualQty(e.target.value)} onKeyDown={enterCommit} placeholder="=數量" className={`${cell} text-right tabular-nums`} />
        ) : (
          <span className="px-1 text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-1">
        {editItem ? (
          <div className="flex items-center gap-1">
            <input type="number" min="0" step="1" value={defectQty} onFocus={selectAll} onChange={(e) => setDefectQty(e.target.value)} onKeyDown={enterCommit} className={`${cell} w-14 text-right tabular-nums`} />
            <select value={defectType} onChange={(e) => setDefectType(e.target.value as '' | 'D' | 'F' | 'W' | 'O')} className={`${cell} w-24 text-xs`} disabled={busy}>
              <option value="">類型</option>
              {Object.entries(DEFECT_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{k} {v}</option>
              ))}
            </select>
          </div>
        ) : (
          <span className="px-1 text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-1">
        <input type="number" min="0" step="0.01" value={cost} onFocus={selectAll} onChange={(e) => setCost(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
      </td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineAmount)}</td>
      <td className="px-2 py-1">
        {editItem ? (
          <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} onKeyDown={enterCommit} placeholder="自動產" className={`${cell} font-mono text-[14px]`} />
        ) : (
          <span className="px-1 text-xs text-muted-foreground">自動</span>
        )}
      </td>
      <td className="px-2 py-1">
        {editItem ? (
          <input type="date" value={warranty} onChange={(e) => setWarranty(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-xs`} />
        ) : (
          <span className="px-1 text-xs text-muted-foreground">自動</span>
        )}
      </td>
      <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">Enter↵ / Esc</td>
    </tr>
  );
}

/** RR 明細表（純呈現）：料號/品名/庫位/數量/實收/瑕疵/單價/金額/批號/保固 */
function RrItemsTable({
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
  appendRow,
}: {
  items: RrItem[];
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
  renderEditRow?: (it: RrItem) => React.ReactNode;
  appendRow?: React.ReactNode;
}) {
  const colCount = editable ? 12 : 11;
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
  const pad = Math.max(0, fitRows - items.length - (appendRow ? 1 : 0));
  const locCode = (id: string) => locs.find((l) => l.id === id)?.code ?? id;
  return (
    <div ref={scrollRef} className="flex-1 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-border/60 [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border/60">
        <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">序號</th>
            <th className="px-3 py-2 text-left">料號</th>
            <th className="px-3 py-2 text-left">品名</th>
            <th className="px-3 py-2 text-left">庫位</th>
            <th className="px-3 py-2 text-right">數量</th>
            <th className="px-3 py-2 text-right">實收量</th>
            <th className="px-3 py-2 text-right">瑕疵</th>
            <th className="px-3 py-2 text-right">單價</th>
            <th className="px-3 py-2 text-right">金額</th>
            <th className="px-3 py-2 text-left">批號</th>
            <th className="px-3 py-2 text-left">保固到期</th>
            {editable ? <th className="px-3 py-2"></th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            if (editingItemId && it.id === editingItemId && renderEditRow) {
              return <Fragment key={it.id}>{renderEditRow(it)}</Fragment>;
            }
            const sel = it.id === selectedItemId;
            const defect = Number(it.defectQty || 0);
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
                <td className="px-3 py-2 font-mono text-[14px]">{it.partNo}</td>
                <td className="px-3 py-2">{it.partName}</td>
                <td className="px-3 py-2 font-mono text-[14px]">{locCode(it.locationId)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(it.qty)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.actualQty != null ? Number(it.actualQty) : <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2 text-right text-xs">
                  {defect > 0 ? (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] text-rose-700">
                      {defect}{it.defectType ? `・${DEFECT_TYPE_LABEL[it.defectType] ?? it.defectType}` : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(it.unitCost)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(it.lineAmount)}</td>
                <td className="px-3 py-2 font-mono text-[14px]">{it.batchNo ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{it.warrantyExpiredAt ? it.warrantyExpiredAt.slice(0, 10) : '—'}</td>
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
          {appendRow}
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

/** 從來源採購單帶入進貨明細：列剩餘可收的行、每行勾選＋收量＋庫位（伺服器端仍驗可收量） */
function PoLineAddDialog({
  poId,
  rrDocNo,
  locs,
  onClose,
  onConfirm,
}: {
  poId: string;
  rrDocNo: string;
  locs: LocOpt[];
  onClose: () => void;
  onConfirm: (rows: { partId: string; qty: number; locationId: string; unitCost: number }[]) => void | Promise<void>;
}) {
  const [po, setPo] = useState<Po | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [lineLocs, setLineLocs] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const p = await getPo(poId);
        setPo(p);
        const q: Record<string, string> = {};
        (p.items ?? []).forEach((it) => {
          const remain = Number(it.qty) - Number(it.receivedQty || 0) - Number(it.cancelledQty || 0);
          q[it.id] = String(Math.max(0, remain));
        });
        setQtys(q);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [poId]);

  const toggle = (itemId: string) =>
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(itemId)) n.delete(itemId);
      else n.add(itemId);
      return n;
    });

  const items = po?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            從採購單帶入進貨明細　<span className="font-mono text-muted-foreground">{po?.docNo ?? ''}</span>
            <span className="ml-2 text-xs text-muted-foreground">→ {rrDocNo}</span>
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉"><X className="h-4 w-4" /></button>
        </div>
        {err ? <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{err}</div> : null}
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">載入中…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">來源採購單無明細。</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-left">料號</th>
                  <th className="px-2 py-2 text-left">品名</th>
                  <th className="px-2 py-2 text-right">訂購量</th>
                  <th className="px-2 py-2 text-right">已收量</th>
                  <th className="px-2 py-2 text-right">本次收量</th>
                  <th className="px-2 py-2 text-left">入庫庫位</th>
                  <th className="px-2 py-2 text-right">單價</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const remain = Number(it.qty) - Number(it.receivedQty || 0) - Number(it.cancelledQty || 0);
                  return (
                    <tr key={it.id} className={remain <= 0 ? 'opacity-40' : 'hover:bg-accent/10'}>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" disabled={remain <= 0} checked={checked.has(it.id)} onChange={() => toggle(it.id)} />
                      </td>
                      <td className="cursor-pointer px-2 py-1.5 font-mono text-[14px]" onClick={() => remain > 0 && toggle(it.id)}>{it.partNo}</td>
                      <td className="cursor-pointer px-2 py-1.5" onClick={() => remain > 0 && toggle(it.id)}>{it.partName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{it.qty}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{Number(it.receivedQty || 0)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          max={remain}
                          step="1"
                          disabled={remain <= 0}
                          value={qtys[it.id] ?? ''}
                          onChange={(e) => setQtys((p) => ({ ...p, [it.id]: e.target.value }))}
                          className="w-20 rounded border bg-background px-2 py-0.5 text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          disabled={remain <= 0}
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">收量超過「訂購量－已收量－取消量」時伺服器會擋下；帶入行未選庫位者不會帶入。</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button
            type="button"
            disabled={checked.size === 0}
            onClick={() =>
              void onConfirm(
                items
                  .filter((it) => checked.has(it.id))
                  .map((it) => ({
                    partId: it.partId,
                    qty: Number(qtys[it.id]) || 0,
                    locationId: lineLocs[it.id] ?? '',
                    unitCost: Number(it.unitCost) || 0,
                  }))
                  .filter((r) => r.qty > 0 && !!r.locationId),
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

/** NX-DOC-PRINT：進貨單列印設定（DocPrintView 皮；庫位代碼由面板庫位表查） */
function RrPrintSheet({ doc, locs, onClose }: { doc: Rr; locs: LocOpt[]; onClose: () => void }) {
  const lc = (id: string) => locs.find((l) => l.id === id)?.code ?? id;
  return (
    <DocPrintView
      title="進　貨　驗　收　單"
      docNo={doc.docNo}
      fields={[
        { label: '單號', value: doc.docNo },
        { label: '進貨日期', value: doc.rrDate.slice(0, 10) },
        { label: '供應商編號', value: doc.supplierCode ?? '' },
        { label: '供應商名稱', value: doc.supplierName ?? '' },
        { label: '入庫倉庫', value: doc.warehouseName ?? '' },
        { label: '來源單號', value: doc.poDocNo ?? doc.tiDocNo ?? doc.rfqDocNo ?? '' },
        { label: '提貨單號', value: doc.deliveryOrderNo ?? '' },
        { label: '幣別 / 稅率', value: `${doc.currencyId} / ${Number(doc.taxRate)}%` },
      ]}
      columns={[
        { label: '序', width: '5%', align: 'center', render: (it) => it.lineNo },
        { label: '料號', width: '16%', render: (it) => <span className="font-mono">{it.partNo}</span> },
        { label: '品名', render: (it) => it.partName },
        { label: '庫位', width: '9%', render: (it) => <span className="font-mono">{lc(it.locationId)}</span> },
        { label: '數量', width: '7%', align: 'right', render: (it) => Number(it.qty) },
        { label: '實收', width: '7%', align: 'right', render: (it) => (it.actualQty != null ? Number(it.actualQty) : '') },
        { label: '瑕疵', width: '7%', align: 'right', render: (it) => (Number(it.defectQty || 0) > 0 ? Number(it.defectQty) : '') },
        { label: '單價', width: '10%', align: 'right', render: (it) => printMoney(it.unitCost) },
        { label: '金額', width: '11%', align: 'right', render: (it) => printMoney(it.lineAmount) },
        { label: '批號', width: '10%', render: (it) => <span className="font-mono">{it.batchNo ?? ''}</span> },
      ]}
      items={doc.items ?? []}
      getRowKey={(it) => it.id}
      totals={[
        { label: '未稅金額', value: printMoney(doc.subtotal) },
        { label: `稅額（${Number(doc.taxRate)}%）`, value: printMoney(doc.taxAmount) },
        { label: '總計', value: printMoney(doc.totalAmount), strong: true },
      ]}
      note={doc.remark}
      signatures={['驗收', '倉管', '主管']}
      onClose={onClose}
    />
  );
}
