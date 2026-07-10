// apps/nx-ui/src/features/nx02/rfq/ui/RfqDetailView.new.tsx
// NX02-RFQ-SHELL：詢價單詳情面板（比照 PoDetailView.new 模板：左右兩塊 + 三狀態工作列）
//   RFQ 專屬：狀態流（發出→回覆→結案/作廢）、產生詢價文字（複製到 LINE/Email）、
//   QT 並排比價（新增報價/採用→自動建 PO/TI + RFQ 結案）、REPLIED 轉採購/轉進貨。
//   回覆編輯：改走「逐行 PATCH item」（unitPrice/leadTimeDays/status R|C）
//   —— 舊視圖的批次「儲存回覆」打死路徑 /nx02/rfq/reply/:id（後端不存在、按下必 fail）、不搬。
'use client';

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Download,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShoppingCart,
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
import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';

import {
  addRfqItem,
  createRfq,
  getRfq,
  patchRfqItem,
  removeRfqItem,
  updateRfq,
  voidRfq,
} from '@data/endpoints/nx02/rfq/api/rfq';
import { generateRfqInquiryText } from '@data/endpoints/nx03/rfq-greeting-template/api/rfq-greeting-template';
import { adoptQt, createQt, listQuotesByRfq, type QtRow } from '@data/endpoints/nx03/qt/api/qt';
import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';
import type { Rfq, RfqItem } from '@data/types/nx02/rfq';
import { RFQ_ITEM_STATUS_LABEL, RFQ_STATUS_LABEL } from '@data/types/nx02/rfq';

const fmt = (n: string | number | null | undefined) =>
  Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

export function RfqDetailPanel({
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
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [manualAdd, setManualAdd] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selItem, setSelItem] = useState<string | null>(null);

  // 詢價文字（M2-e：業務 copy 到 LINE/電話）
  const [inquiryText, setInquiryText] = useState<string | null>(null);
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  // 表頭可編欄位（DRAFT 編輯）
  const [rfqDate, setRfqDate] = useState('');
  const [supplierPick, setSupplierPick] = useState<PickedCustomer | null>(null);
  const [clearSupplier, setClearSupplier] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRfq(await getRfq(id));
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
    if (!rfq) return;
    setRfqDate(rfq.rfqDate.slice(0, 10));
    setContactName(rfq.contactName ?? '');
    setContactPhone(rfq.contactPhone ?? '');
    setRemark(rfq.remark ?? '');
    setSupplierPick(null);
    setClearSupplier(false);
  }, [rfq?.id, rfq?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
      setInquiryText(null);
    }
  }, [id]);

  // 明細預設選第一列
  useEffect(() => {
    const its = rfq?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [rfq, selItem]);

  // 明細 ↑↓ 選列
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = rfq?.items ?? [];
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
  }, [rfq, selItem]);

  // 編輯明細 Alt 快捷
  useEffect(() => {
    if (mode !== 'editItems') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (manualAdd || editingItemId)) {
        e.preventDefault();
        setManualAdd(false);
        setEditingItemId(null);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const map: Record<string, () => void> = {
        n: () => {
          setEditingItemId(null);
          setManualAdd(true);
        },
        e: () => {
          if (selItem) {
            setManualAdd(false);
            setEditingItemId(selItem);
          }
        },
        d: () => void removeSelectedItem(),
        s: () => {
          setManualAdd(false);
          setEditingItemId(null);
          setMode('browse');
        },
        c: () => {
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
  }, [mode, manualAdd, editingItemId, selItem]);

  useEffect(() => {
    if (mode !== 'editItems') {
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

  async function onGenerateInquiryText() {
    setInquiryBusy(true);
    setError(null);
    setCopyHint(null);
    try {
      const res = await generateRfqInquiryText(id);
      setInquiryText(res.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : '產生詢價文字失敗');
    } finally {
      setInquiryBusy(false);
    }
  }

  async function onCopyInquiryText() {
    if (!inquiryText) return;
    try {
      await navigator.clipboard.writeText(inquiryText);
      setCopyHint('已複製到剪貼簿、可貼到 LINE/Email');
      setTimeout(() => setCopyHint(null), 3000);
    } catch {
      setCopyHint('複製失敗、請手動全選複製');
    }
  }

  if (loading && !rfq) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !rfq) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!rfq) return null;

  const s = rfq.status;
  const headerEditable = s === 'DRAFT';
  const itemsEditable2 = s === 'DRAFT' || s === 'SENT'; // 後端 assertItemsEditable（SENT=回覆編輯）
  const headerEditing = mode === 'editHeader' && headerEditable;
  const itemsEditing = mode === 'editItems' && itemsEditable2;

  const canIssue = s === 'DRAFT' && (rfq.items?.length ?? 0) > 0;
  const canClose = s === 'REPLIED';
  const canConvert = s === 'REPLIED';
  const canVoid = s === 'DRAFT' || s === 'SENT';

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateRfq(id, {
        rfqDate,
        contactName: contactName.trim() || null,
        contactPhone: contactPhone.trim() || null,
        remark: remark.trim() || null,
        ...(supplierPick ? { supplierId: supplierPick.id } : clearSupplier ? { supplierId: null } : {}),
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
    if (rfq) {
      setRfqDate(rfq.rfqDate.slice(0, 10));
      setContactName(rfq.contactName ?? '');
      setContactPhone(rfq.contactPhone ?? '');
      setRemark(rfq.remark ?? '');
      setSupplierPick(null);
      setClearSupplier(false);
    }
    setMode('browse');
  }

  async function removeSelectedItem() {
    if (rfq!.status !== 'DRAFT') {
      alert('僅草稿可移除明細');
      return;
    }
    if (!selItem) {
      alert('請先選一筆明細');
      return;
    }
    if (!window.confirm('移除選中的明細項目？')) return;
    try {
      await removeRfqItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
  }

  function doIssue() {
    if (!window.confirm('發出詢價？（發出後料號/數量鎖定、改填供應商回覆）')) return;
    void handle(() => updateRfq(id, { status: 'SENT' }), '發出');
  }
  function doClose() {
    if (!window.confirm('結案此詢價單？')) return;
    void handle(() => updateRfq(id, { status: 'CLOSED' }), '結案');
  }
  function doVoid() {
    if (!window.confirm(`作廢詢價單 ${rfq!.docNo}？`)) return;
    void handle(() => voidRfq(id), '作廢');
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
              <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={(headerEditable || itemsEditable2) && !busy} onClick={() => setMode(headerEditable ? 'editHeader' : 'editItems')} />
              <ToolbarButton icon={Trash2} letter="D" label="作廢" enabled={canVoid && !busy} variant="danger" onClick={doVoid} />
              <ToolbarSeparator />
              {canIssue ? <ToolbarButton icon={Send} letter="G" label="發出" enabled={!busy} accent onClick={doIssue} /> : null}
              {canConvert ? <ToolbarButton icon={ShoppingCart} label="轉採購" enabled={!busy} accent onClick={() => router.push(`/dashboard/purchase/po/new?rfq=${encodeURIComponent(id)}`)} /> : null}
              {canConvert ? <ToolbarButton icon={Truck} label="轉進貨" enabled={!busy} onClick={() => router.push(`/dashboard/purchase/rr/new?rfq=${encodeURIComponent(id)}`)} /> : null}
              {canClose ? <ToolbarButton icon={CheckCircle2} label="結案" enabled={!busy} onClick={doClose} /> : null}
              <ToolbarSeparator />
              <ToolbarButton icon={ClipboardList} label="詢價文字" enabled={!inquiryBusy} pressed={inquiryText !== null} onClick={() => void onGenerateInquiryText()} />
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
              <ToolbarButton icon={Plus} letter="N" label="新增項目" enabled={itemsEditing && s === 'DRAFT'} pressed={manualAdd} onClick={() => { setEditingItemId(null); setManualAdd(true); }} />
              <ToolbarButton icon={Pencil} letter="E" label={s === 'SENT' ? '填回覆' : '編輯項目'} enabled={itemsEditing && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) { setManualAdd(false); setEditingItemId(selItem); } }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditing && s === 'DRAFT' && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
          {mode === 'editItems' && s === 'SENT' ? (
            <span className="px-1 text-[11px] text-amber-600">回覆模式：逐行填單價/交期、或標「不採用」</span>
          ) : null}
        </div>
      </ToolbarPortal>

      {printOpen && rfq ? <RfqPrintSheet doc={rfq} onClose={() => setPrintOpen(false)} /> : null}

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}

      {inquiryText !== null ? (
        <div className="mx-4 mt-3 space-y-2 rounded-lg border border-sky-300/60 bg-sky-50/50 p-3 dark:bg-sky-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">詢價文字（複製到 LINE/Email 用）</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void onCopyInquiryText()} className="rounded border px-2 py-0.5 text-xs hover:bg-accent/20">複製</button>
              <button type="button" onClick={() => { setInquiryText(null); setCopyHint(null); }} className="rounded border px-2 py-0.5 text-xs hover:bg-accent/20">關閉</button>
            </div>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs">{inquiryText}</pre>
          {copyHint ? <p className="text-xs text-emerald-600">{copyHint}</p> : null}
          <p className="text-[11px] text-muted-foreground">
            開頭/結尾客套話到 <Link href="/dashboard/purchase/rfq-greeting-template" className="underline">客套話設定頁</Link> 調整。
          </p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[420px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <FieldRow label="單號"><input readOnly value={rfq.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={RFQ_STATUS_LABEL[s] ?? s} className={roCls} /></FieldRow>
          <FieldRow label="詢價日期"><input type="date" value={rfqDate} onChange={(e) => setRfqDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="供應商">
            {headerEditing ? (
              <div className="space-y-1">
                <CustomerPicker partnerType="S" onPick={(p) => { setSupplierPick(p); setClearSupplier(false); }} onCommit={() => {}} />
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>目前：{supplierPick ? `${supplierPick.code}　${supplierPick.name}` : clearSupplier ? '（清除、改未指定）' : (rfq.supplierName ?? '未指定')}</span>
                  {(rfq.supplierId || supplierPick) && !clearSupplier ? (
                    <button type="button" className="underline" onClick={() => { setSupplierPick(null); setClearSupplier(true); }}>清除</button>
                  ) : null}
                </div>
              </div>
            ) : (
              <input readOnly value={rfq.supplierName ? `${rfq.supplierCode ?? ''}　${rfq.supplierName}` : '未指定（可先問多家）'} className={roCls} />
            )}
          </FieldRow>
          <FieldRow label="聯絡人"><input value={contactName} onChange={(e) => setContactName(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="電話"><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="需求倉庫"><input readOnly value={rfq.warehouseName ? `${rfq.warehouseCode ?? ''}　${rfq.warehouseName}` : (rfq.warehouseId ?? '—')} className={roCls} /></FieldRow>
          <FieldRow label="幣別"><input readOnly value={rfq.currency} className={roCls} /></FieldRow>
          <FieldRow label="建單人員"><input readOnly value={rfq.createdByName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={rfq.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!headerEditing} rows={3} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>
        </section>

        {/* 右：明細 + QT 比價 */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto transition-opacity ${mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''}`}>
          <RfqItemsTable
            items={rfq.items ?? []}
            status={s}
            editable={itemsEditing}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
            onRemoveItem={
              s === 'DRAFT'
                ? async (itemId) => {
                    try {
                      await removeRfqItem(id, itemId);
                      await reloadAll();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : '刪除失敗');
                    }
                  }
                : undefined
            }
            editingItemId={itemsEditing ? editingItemId : null}
            renderEditRow={(it) => (
              <RfqInlineItemRow rfqId={rfq.id} status={s} editItem={it} onSaved={reloadAll} onExit={() => setEditingItemId(null)} />
            )}
            appendRow={
              itemsEditing && s === 'DRAFT' && manualAdd ? (
                <RfqInlineItemRow rfqId={rfq.id} status={s} onSaved={reloadAll} onExit={() => setManualAdd(false)} />
              ) : null
            }
          />
          <QtCompareSection rfqId={rfq.id} onAdopted={reloadAll} />
        </section>
      </div>
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

/** QT 並排比價：多家供應商回報 → 排序 → 採用（自動建 PO/TI、連帶拒絕兄弟、RFQ 結案） */
function QtCompareSection({ rfqId, onAdopted }: { rfqId: string; onAdopted: () => void | Promise<void> }) {
  const [quotes, setQuotes] = useState<QtRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<PickedCustomer | null>(null);
  const [newQt, setNewQt] = useState({ quotedPrice: '', quotedQuantity: '', leadDays: '', notes: '' });

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const res = await listQuotesByRfq(rfqId);
      setQuotes(res.quotes);
      setLoaded(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入報價失敗');
    } finally {
      setBusy(false);
    }
  }

  async function onAdd() {
    if (!newSupplier || !newQt.quotedPrice || !newQt.quotedQuantity) {
      setErr('請選供應商並填 單價 + 數量');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await createQt({
        rfqId,
        inquiryPartnerId: newSupplier.id,
        quotedPrice: Number(newQt.quotedPrice),
        quotedQuantity: Number(newQt.quotedQuantity),
        leadDays: newQt.leadDays ? Number(newQt.leadDays) : null,
        notes: newQt.notes.trim() || undefined,
      });
      setNewQt({ quotedPrice: '', quotedQuantity: '', leadDays: '', notes: '' });
      setNewSupplier(null);
      setAddOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '新增報價失敗');
    } finally {
      setBusy(false);
    }
  }

  async function onAdopt(qtId: string) {
    if (!window.confirm('採用此報價？（自動建立採購單/調貨單、連帶拒絕其他報價、詢價單結案）')) return;
    setBusy(true);
    setErr(null);
    try {
      const result = await adoptQt(qtId);
      const created = result.createdDocKind === 'PO' ? `已建立採購單 ${result.poDocNo}` : `已建立調貨單 ${result.tiDocNo}`;
      alert(`✅ ${created}\n（連帶拒絕 ${result.rejectedSiblingCount} 筆其他報價、詢價單已結案）`);
      await load();
      await onAdopted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '採用失敗');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <div className="shrink-0 space-y-2 rounded-lg border border-border/40 bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold">📊 並排比價（多家供應商報價 → 採用自動建單）</h3>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => void load()} className="rounded border px-2 py-0.5 text-xs hover:bg-accent/20 disabled:opacity-50">
            {busy ? '處理中…' : loaded ? '重新整理' : '載入報價'}
          </button>
          {loaded ? (
            <button type="button" onClick={() => setAddOpen((v) => !v)} className="rounded border px-2 py-0.5 text-xs hover:bg-accent/20">
              {addOpen ? '收合新增' : '＋新增報價'}
            </button>
          ) : null}
        </div>
      </div>
      {err ? <div className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs">{err}</div> : null}
      {!loaded ? (
        <p className="text-xs text-muted-foreground">點「載入報價」查看已收到的供應商回報。</p>
      ) : quotes.length === 0 ? (
        <p className="text-xs text-muted-foreground">尚未收到任何報價、點「＋新增報價」填入業務外部問到的價格。</p>
      ) : (
        <div className="overflow-x-auto rounded border border-border/40">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">排名</th>
                <th className="px-2 py-1 text-left">供應商</th>
                <th className="px-2 py-1 text-right">單價</th>
                <th className="px-2 py-1 text-right">數量</th>
                <th className="px-2 py-1 text-right">交期(天)</th>
                <th className="px-2 py-1 text-left">備註</th>
                <th className="px-2 py-1 text-left">狀態</th>
                <th className="px-2 py-1 text-left">動作</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, idx) => (
                <tr key={q.id} className={`border-t border-border/30 ${idx === 0 ? 'bg-emerald-500/10' : ''}`}>
                  <td className="px-2 py-1">
                    {idx === 0 && q.status === 'P' ? <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-emerald-900">🏆 最低</span> : `#${idx + 1}`}
                  </td>
                  <td className="px-2 py-1 font-mono">{q.inquiryPartner?.code} {q.inquiryPartner?.name ?? q.inquiryPartnerId}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{fmt(q.quotedPrice as unknown as string)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{String(q.quotedQuantity)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{q.leadDays ?? '-'}</td>
                  <td className="px-2 py-1 text-muted-foreground">{q.notes ?? '-'}</td>
                  <td className="px-2 py-1">
                    {q.status === 'P' ? <span className="text-amber-600">待決定</span> : q.status === 'A' ? <span className="text-emerald-600">已採用</span> : <span className="text-rose-600">已拒絕</span>}
                  </td>
                  <td className="px-2 py-1">
                    {q.status === 'P' ? (
                      <button type="button" disabled={busy} onClick={() => void onAdopt(q.id)} className="rounded bg-primary px-2 py-0.5 text-primary-foreground disabled:opacity-50">採用</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loaded && addOpen ? (
        <div className="space-y-2 rounded border border-border/40 bg-muted/20 p-2">
          <div className="text-[11px] text-muted-foreground">新增一筆報價（業務外部問完填入）：</div>
          <CustomerPicker partnerType="S" onPick={setNewSupplier} onCommit={() => {}} />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input type="number" step="0.0001" placeholder="單價" value={newQt.quotedPrice} onChange={(e) => setNewQt({ ...newQt, quotedPrice: e.target.value })} className={inputCls} />
            <input type="number" step="1" placeholder="可供數量" value={newQt.quotedQuantity} onChange={(e) => setNewQt({ ...newQt, quotedQuantity: e.target.value })} className={inputCls} />
            <input type="number" placeholder="交期天數" value={newQt.leadDays} onChange={(e) => setNewQt({ ...newQt, leadDays: e.target.value })} className={inputCls} />
            <input placeholder="備註" value={newQt.notes} onChange={(e) => setNewQt({ ...newQt, notes: e.target.value })} className={inputCls} />
          </div>
          <button type="button" disabled={busy} onClick={() => void onAdd()} className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50">新增報價</button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 內嵌明細列（依狀態變形）
 *  DRAFT 新增：料號 picker + 數量 + 備註 → addRfqItem
 *  DRAFT 編輯：數量 / 備註（料號鎖定）
 *  SENT 填回覆：單價 / 交期 / 已回覆|不採用（料號數量鎖定）→ patchRfqItem（取代舊死路徑批次回覆）
 *  Enter 存檔、Esc 退出。
 */
function RfqInlineItemRow({
  rfqId,
  status,
  editItem,
  onSaved,
  onExit,
}: {
  rfqId: string;
  status: string;
  editItem?: RfqItem;
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const isReply = status === 'SENT' && !!editItem;
  const [part, setPart] = useState<PickedPart | null>(null);
  const [qty, setQty] = useState(String(editItem?.qty ?? '1'));
  const [rmk, setRmk] = useState(editItem?.remark ?? '');
  const [price, setPrice] = useState(editItem?.unitPrice != null ? String(editItem.unitPrice) : '');
  const [lead, setLead] = useState(editItem?.leadTimeDays != null ? String(editItem.leadTimeDays) : '');
  const [istatus, setIstatus] = useState<'R' | 'C'>(editItem?.status === 'C' ? 'C' : 'R');
  const [busy, setBusy] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);
  const partRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isReply) priceRef.current?.focus();
    else if (editItem) qtyRef.current?.focus();
    else partRef.current?.focus();
  }, [editItem, isReply]);

  const commit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isReply) {
        if (istatus === 'R' && !(Number(price) >= 0 && price.trim() !== '')) {
          priceRef.current?.focus();
          setBusy(false);
          return;
        }
        await patchRfqItem(rfqId, editItem!.id, {
          unitPrice: istatus === 'C' ? null : Number(price),
          leadTimeDays: istatus === 'C' || lead.trim() === '' ? null : Number(lead),
          status: istatus,
        });
      } else if (editItem) {
        if (Number(qty) <= 0) {
          qtyRef.current?.focus();
          setBusy(false);
          return;
        }
        await patchRfqItem(rfqId, editItem.id, { qty: Number(qty), remark: rmk.trim() || null });
      } else {
        if (!part) {
          partRef.current?.focus();
          setBusy(false);
          return;
        }
        if (Number(qty) <= 0) {
          qtyRef.current?.focus();
          setBusy(false);
          return;
        }
        await addRfqItem(rfqId, { partId: part.id, qty: Number(qty), remark: rmk.trim() || undefined });
      }
      await onSaved();
      onExit();
    } catch (e) {
      alert(e instanceof Error ? e.message : '存檔失敗');
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
          <span className="font-mono text-xs">{editItem.partNo}　{editItem.partName}</span>
        ) : (
          <PartPicker inputRef={partRef} onPick={setPart} />
        )}
      </td>
      <td className="px-2 py-1">
        {isReply ? (
          <span className="px-1 text-right tabular-nums">{Number(editItem!.qty)}</span>
        ) : (
          <input ref={qtyRef} type="number" min="0" step="1" value={qty} onFocus={selectAll} onChange={(e) => setQty(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
        )}
      </td>
      <td className="px-2 py-1">
        {isReply ? (
          <input ref={priceRef} type="number" min="0" step="0.01" disabled={istatus === 'C'} value={price} onFocus={selectAll} onChange={(e) => setPrice(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
        ) : (
          <span className="px-1 text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-1">
        {isReply ? (
          <input type="number" min="0" step="1" disabled={istatus === 'C'} value={lead} onFocus={selectAll} onChange={(e) => setLead(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
        ) : (
          <span className="px-1 text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-1">
        {isReply ? (
          <select value={istatus} onChange={(e) => setIstatus(e.target.value as 'R' | 'C')} className={cell} disabled={busy}>
            <option value="R">已回覆</option>
            <option value="C">不採用</option>
          </select>
        ) : (
          <span className="px-1 text-xs text-muted-foreground">{editItem ? RFQ_ITEM_STATUS_LABEL[editItem.status] ?? editItem.status : '待回覆'}</span>
        )}
      </td>
      <td className="px-2 py-1">
        {isReply ? (
          <span className="px-1 text-xs text-muted-foreground">{editItem!.remark ?? ''}</span>
        ) : (
          <input value={rmk} onChange={(e) => setRmk(e.target.value)} onKeyDown={enterCommit} placeholder="備註" className={`${cell} text-xs`} />
        )}
      </td>
      <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">Enter↵ / Esc</td>
    </tr>
  );
}

/** RFQ 明細表（純呈現）：料號(+廠牌小字)/品名/數量/單價/交期/明細狀態/備註 */
function RfqItemsTable({
  items,
  status,
  editable,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  editingItemId,
  renderEditRow,
  appendRow,
}: {
  items: RfqItem[];
  status: string;
  editable: boolean;
  selectedItemId: string | null;
  onSelectItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  editingItemId?: string | null;
  renderEditRow?: (it: RfqItem) => React.ReactNode;
  appendRow?: React.ReactNode;
}) {
  const showDelete = editable && status === 'DRAFT';
  const colCount = showDelete ? 9 : 8;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitRows, setFitRows] = useState(10);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ROW = 37;
    const calc = () => setFitRows(Math.max(0, Math.floor((el.clientHeight - 38) / ROW)));
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pad = Math.max(0, fitRows - items.length - (appendRow ? 1 : 0));
  return (
    <div ref={scrollRef} className="min-h-[16rem] flex-1 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-border/60 [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border/60">
        <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">序號</th>
            <th className="px-3 py-2 text-left">料號</th>
            <th className="px-3 py-2 text-left">品名</th>
            <th className="px-3 py-2 text-right">數量</th>
            <th className="px-3 py-2 text-right">回覆單價</th>
            <th className="px-3 py-2 text-right">交期(天)</th>
            <th className="px-3 py-2 text-left">明細狀態</th>
            <th className="px-3 py-2 text-left">備註</th>
            {showDelete ? <th className="px-3 py-2"></th> : null}
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
                <td className="px-3 py-2 font-mono text-xs">
                  <div>{it.partNo}</div>
                  {it.secCode ? <div className="mt-0.5 text-[10px] text-muted-foreground" title="廠牌料號">{it.secCode}</div> : null}
                </td>
                <td className="px-3 py-2">{it.partName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(it.qty)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.unitPrice != null ? fmt(it.unitPrice) : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.leadTimeDays ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{RFQ_ITEM_STATUS_LABEL[it.status] ?? it.status}</td>
                <td className="px-3 py-2 text-xs">{it.remark ?? ''}</td>
                {showDelete ? (
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
      </table>
    </div>
  );
}

/** 新增詢價單面板（內嵌）：倉庫(必) + 供應商(選、可先不指定問多家) + 首行明細（料號/數量） */
export function RfqCreatePanel({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [supplier, setSupplier] = useState<PickedCustomer | null>(null);
  const [rfqDate, setRfqDate] = useState(new Date().toISOString().slice(0, 10));
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [remark, setRemark] = useState('');
  const [part, setPart] = useState<PickedPart | null>(null);
  const [firstQty, setFirstQty] = useState('1');
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

  async function doSave() {
    setErr(null);
    if (!warehouseId) {
      setErr('請先選需求倉庫');
      return;
    }
    if (!part) {
      setErr('請選首行明細的料號');
      return;
    }
    if (!(Number(firstQty) > 0)) {
      setErr('首行數量須 > 0');
      return;
    }
    setBusy(true);
    try {
      const created = await createRfq({
        warehouseId,
        rfqDate,
        supplierId: supplier?.id ?? null,
        contactName: contactName.trim() || null,
        contactPhone: contactPhone.trim() || null,
        remark: remark.trim() || null,
        items: [{ partId: part.id, qty: Number(firstQty) }],
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
          <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!!warehouseId && !!part && !busy} accent onClick={() => void doSave()} />
          <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={onCancel} />
          <div className="flex-1" />
          <span className="px-1 text-[11px] text-muted-foreground">新增詢價單</span>
        </div>
      </ToolbarPortal>

      {err ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號"><input readOnly value="存檔後產生" className={roCls} /></FieldRow>
          <FieldRow label="需求倉庫">
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}>
              <option value="">— 選倉庫 —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code}　{w.name}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="供應商">
            <div className="space-y-1">
              <CustomerPicker partnerType="S" onPick={setSupplier} onCommit={() => {}} />
              <p className="text-[11px] text-muted-foreground">{supplier ? `已選：${supplier.code}　${supplier.name}` : '可不指定（先問多家、用比價區收報價）'}</p>
            </div>
          </FieldRow>
          <FieldRow label="詢價日期"><input type="date" value={rfqDate} onChange={(e) => setRfqDate(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="聯絡人"><input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="電話"><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="備註"><input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} /></FieldRow>
          <div className="rounded border border-border/40 bg-muted/20 p-2">
            <div className="mb-1 text-xs text-muted-foreground">首行明細（建單至少一行、之後可再加）：</div>
            <div className="space-y-2">
              <PartPicker onPick={setPart} />
              <input type="number" min="1" step="1" value={firstQty} onChange={(e) => setFirstQty(e.target.value)} placeholder="數量" className={`${inputCls} text-right`} />
            </div>
          </div>
        </section>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-border">
          <div className="p-6 text-sm text-muted-foreground">存檔後進入明細編輯可繼續加行；發出後改填供應商回覆、或用比價區收多家報價。</div>
        </section>
      </div>
    </div>
  );
}

/** NX-DOC-PRINT：詢價單列印設定（DocPrintView 皮） */
function RfqPrintSheet({ doc, onClose }: { doc: Rfq; onClose: () => void }) {
  return (
    <DocPrintView
      title="詢　價　單"
      docNo={doc.docNo}
      fields={[
        { label: '單號', value: doc.docNo },
        { label: '詢價日期', value: doc.rfqDate.slice(0, 10) },
        { label: '供應商編號', value: doc.supplierCode ?? '' },
        { label: '供應商名稱', value: doc.supplierName ?? '未指定' },
        { label: '聯絡人', value: doc.contactName ?? '' },
        { label: '電話', value: doc.contactPhone ?? '' },
        { label: '需求倉庫', value: doc.warehouseName ?? '' },
        { label: '幣別', value: doc.currency },
      ]}
      columns={[
        { label: '序', width: '6%', align: 'center', render: (it) => it.lineNo },
        {
          label: '料號', width: '20%',
          render: (it) => (
            <span className="font-mono">
              {it.partNo}
              {it.secCode ? <><br /><span className="text-neutral-500">{it.secCode}</span></> : null}
            </span>
          ),
        },
        { label: '品名', render: (it) => it.partName },
        { label: '數量', width: '9%', align: 'right', render: (it) => Number(it.qty) },
        { label: '回覆單價', width: '12%', align: 'right', render: (it) => (it.unitPrice != null ? printMoney(it.unitPrice) : '') },
        { label: '交期(天)', width: '9%', align: 'right', render: (it) => it.leadTimeDays ?? '' },
        { label: '備註', width: '14%', render: (it) => it.remark ?? '' },
      ]}
      items={doc.items ?? []}
      getRowKey={(it) => it.id}
      note={doc.remark}
      signatures={['採購', '主管']}
      onClose={onClose}
    />
  );
}
