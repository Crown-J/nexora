// apps/nx-ui/src/features/nx02/po/ui/PoDetailView.new.tsx
// NX02-PO-SHELL：採購單詳情面板（比照 RrDetailView.new 模板：左右兩塊 + 三狀態工作列）
//   PO 專屬：九階狀態流（送審→核准/退件→寄出→廠商確認(立應付)→轉進貨→結案）、
//   T6 里程碑/物流 + T7 對象與地址（非終態 inline 編輯、onBlur 直接 patch）、
//   明細編輯（DRAFT/APPROVED 加改刪；CONFIRMED/PARTIAL 取消剩餘）、
//   轉進貨對話框（🔎 修舊版缺庫位 bug：後端 toRr 每行必填 locationId、舊 dialog 沒傳早已 400）。
//   新增面板：手動（供應商+首行明細）/ 從詢價單（?rfq= 入口、帶已回覆有單價行 + rfqItemId）。
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
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { DocPrintView, printMoney } from '@/features/shared/doc-shell/DocPrintView';
import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';

import {
  addPoItem,
  createPo,
  getPo,
  patchPoItem,
  poToRr,
  rejectPo,
  removePoItem,
  updatePo,
  voidPo,
} from '@data/endpoints/nx02/po/api/po';
import { getRfq } from '@data/endpoints/nx02/rfq/api/rfq';
import { fetchAllPages } from '@data/api/fetchAllPages';
import { listPartner } from '@data/endpoints/shared/master/partner/api/partner';
import type { PartnerDto } from '@data/types/shared/master/partner';
import { listPartnerAddresses, type PartnerAddressRow } from '@data/endpoints/shared/address/partner-address-api';
import { listLocation } from '@data/endpoints/shared/master/location/api/location';
import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';
import type { Rfq } from '@data/types/nx02/rfq';
import type { Po, PoItem } from '@data/types/nx02/po';
import { PAYMENT_MILESTONE_LABEL, PO_STATUS_LABEL, PURCHASE_TYPE_LABEL } from '@data/types/nx02/po';

const fmt = (n: string | number | null | undefined) =>
  Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

type LocOpt = { id: string; code: string };

/** 剩餘可收 = 採購量 - 已收量 - 取消量 */
const remainOf = (it: PoItem) => Number(it.qty) - Number(it.receivedQty || 0) - Number(it.cancelledQty || 0);

export function PoDetailPanel({
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
  const [po, setPo] = useState<Po | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [manualAdd, setManualAdd] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selItem, setSelItem] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [toRrOpen, setToRrOpen] = useState(false);

  // T6/T7 下拉資料（比照舊 PoDetailView：報關行=T 類、全廠商、指送對象地址）
  const [allPartners, setAllPartners] = useState<PartnerDto[]>([]);
  const [customsAgents, setCustomsAgents] = useState<PartnerDto[]>([]);
  const [shipToAddresses, setShipToAddresses] = useState<PartnerAddressRow[]>([]);

  // 表頭可編欄位（DRAFT 編輯）
  const [poDate, setPoDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPo(await getPo(id));
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
    if (!po) return;
    setPoDate(po.poDate.slice(0, 10));
    setExpectedDate(po.expectedDate?.slice(0, 10) ?? '');
    setTaxRate(String(Number(po.taxRate) || 0));
    setRemark(po.remark ?? '');
  }, [po?.id, po?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAllPages((page, pageSize) => listPartner({ page, pageSize }), { pageSize: 100, maxPages: 50 })
      .then((items) => {
        const active = items.filter((p) => p.isActive);
        setAllPartners(active);
        setCustomsAgents(active.filter((p) => p.partnerType === 'T'));
      })
      .catch(() => {
        setAllPartners([]);
        setCustomsAgents([]);
      });
  }, []);

  // T7：載入「指送對象」（shipToPartnerId ?? supplierId）的 SHIPPING 地址供下拉
  useEffect(() => {
    if (!po) return;
    const ownerId = po.shipToPartnerId || po.supplierId;
    if (!ownerId) {
      setShipToAddresses([]);
      return;
    }
    listPartnerAddresses(ownerId)
      .then((rows) => setShipToAddresses(rows.filter((r) => r.addressType === 'SHIPPING' && r.isActive)))
      .catch(() => setShipToAddresses([]));
  }, [po?.shipToPartnerId, po?.supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

  // 明細預設選第一列
  useEffect(() => {
    const its = po?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [po, selItem]);

  // 明細 ↑↓ 選列
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (rejectOpen || toRrOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = po?.items ?? [];
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
  }, [po, selItem, rejectOpen, toRrOpen]);

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

  // T6/T7 inline patch（onBlur 直接存、比照舊視圖）
  const patchInline = async (patch: Parameters<typeof updatePo>[1]) => {
    if (!po) return;
    setBusy(true);
    setError(null);
    try {
      await updatePo(po.id, patch);
      await reloadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : '存檔失敗');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !po) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !po) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!po) return null;

  const s = po.status;
  const isTerminal = s === 'CLOSED' || s === 'CANCELLED';
  const headerEditable = s === 'DRAFT';
  const itemsEditable2 = s === 'DRAFT' || s === 'APPROVED'; // 後端 assertPoItemsEditable（加改刪）
  const headerEditing = mode === 'editHeader' && headerEditable;
  const itemsEditing = mode === 'editItems' && itemsEditable2;
  const canCancelRemain = s === 'CONFIRMED' || s === 'PARTIAL_RECEIVED';

  // 九階狀態流按鈕可用性（沿舊 PoDetailView 規則）
  const canSubmitForReview = s === 'DRAFT' && (po.items?.length ?? 0) > 0;
  const canApprove = s === 'PENDING_APPROVAL';
  const canReject = s === 'PENDING_APPROVAL';
  const canSend = s === 'APPROVED';
  const canConfirm = s === 'SUBMITTED';
  const canToRr = (s === 'CONFIRMED' || s === 'PARTIAL_RECEIVED') && (po.items ?? []).some((it) => remainOf(it) > 0);
  const canClose = s === 'RECEIVED';
  const canVoid = s === 'DRAFT';

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updatePo(id, {
        poDate,
        expectedDate: expectedDate || null,
        taxRate: Number(taxRate) || 0,
        remark,
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
    if (po) {
      setPoDate(po.poDate.slice(0, 10));
      setExpectedDate(po.expectedDate?.slice(0, 10) ?? '');
      setTaxRate(String(Number(po.taxRate) || 0));
      setRemark(po.remark ?? '');
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
      await removePoItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
  }

  const runStatus = (next: string, confirmMsg: string, prefix: string) => {
    if (!window.confirm(confirmMsg)) return;
    void handle(() => updatePo(id, { status: next }), prefix);
  };

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60';
  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-foreground';
  const miniInput = 'rounded border border-border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-60';

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
              <ToolbarButton icon={Trash2} letter="D" label="作廢" enabled={canVoid && !busy} variant="danger" onClick={() => {
                if (!window.confirm(`作廢採購單 ${po.docNo}？`)) return;
                void handle(() => voidPo(id), '作廢');
              }} />
              <ToolbarSeparator />
              {/* 九階狀態流：依狀態只亮當下可走的動作 */}
              {canSubmitForReview ? <ToolbarButton icon={Send} letter="G" label="送審" enabled={!busy} onClick={() => runStatus('PENDING_APPROVAL', '送審給主管核准？', '送審')} /> : null}
              {canApprove ? <ToolbarButton icon={CheckCircle2} letter="G" label="核准" enabled={!busy} accent onClick={() => runStatus('APPROVED', '核准此採購單？（會記錄核准人＝您）', '核准')} /> : null}
              {canReject ? <ToolbarButton icon={XCircle} label="退件" enabled={!busy} variant="danger" onClick={() => setRejectOpen(true)} /> : null}
              {canSend ? <ToolbarButton icon={Send} letter="G" label="寄出廠商" enabled={!busy} onClick={() => runStatus('SUBMITTED', '寄出給廠商？', '寄出')} /> : null}
              {canConfirm ? <ToolbarButton icon={CheckCircle2} letter="G" label="廠商確認" enabled={!busy} accent onClick={() => runStatus('CONFIRMED', '廠商確認接單？（會自動產生應付帳款、業務語意「先款後貨」）', '廠商確認')} /> : null}
              {canToRr ? <ToolbarButton icon={Truck} letter="I" label="轉進貨" enabled={!busy} accent onClick={() => setToRrOpen(true)} /> : null}
              {canClose ? <ToolbarButton icon={CheckCircle2} label="結案" enabled={!busy} onClick={() => runStatus('CLOSED', '結案此採購單？', '結案')} /> : null}
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
              <ToolbarButton icon={Plus} letter="N" label="新增項目" enabled={itemsEditing} pressed={manualAdd} onClick={() => { setEditingItemId(null); setManualAdd(true); }} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯項目" enabled={itemsEditing && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) { setManualAdd(false); setEditingItemId(selItem); } }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditing && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
          {mode === 'browse' && isTerminal ? (
            <span className="px-1 text-[11px] text-muted-foreground">{PO_STATUS_LABEL[s]}（終態、無可執行動作）</span>
          ) : null}
        </div>
      </ToolbarPortal>

      {printOpen && po ? <PoPrintSheet doc={po} onClose={() => setPrintOpen(false)} /> : null}

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}
      {s === 'DRAFT' && po.rejectReason ? (
        <div className="mx-4 mt-3 rounded border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-800">退件原因：{po.rejectReason}（修改後可重新送審）</div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form + T6/T7 區塊 */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[440px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <FieldRow label="單號"><input readOnly value={po.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={PO_STATUS_LABEL[s] ?? s} className={roCls} /></FieldRow>
          <FieldRow label="採購類型"><input readOnly value={PURCHASE_TYPE_LABEL[po.purchaseType ?? 'D'] ?? po.purchaseType ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="採購日期"><input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="供應商編號"><input readOnly value={po.supplierCode ?? po.supplierId} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="供應商名稱"><input readOnly value={po.supplierName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="來源詢價單"><input readOnly value={po.rfqDocNo ?? '—'} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="預計到貨"><input type="date" value={expectedDate} min={poDate} onChange={(e) => setExpectedDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="幣別"><input readOnly value={po.currencyId} className={roCls} /></FieldRow>
          <FieldRow label="稅率 %"><input type="number" min="0" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="建單人員"><input readOnly value={po.createdByName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={po.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          {(po.submittedForReviewAt || po.approvedAt || po.sentAt || po.supplierConfirmedAt) ? (
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-[11px] text-muted-foreground">
              {po.submittedForReviewAt ? <span>送審 {po.submittedForReviewAt.slice(0, 10)}</span> : null}
              {po.approvedAt ? <span>核准 {po.approvedAt.slice(0, 10)}</span> : null}
              {po.sentAt ? <span>寄出 {po.sentAt.slice(0, 10)}</span> : null}
              {po.supplierConfirmedAt ? <span>廠商確認 {po.supplierConfirmedAt.slice(0, 10)}</span> : null}
            </p>
          ) : null}
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!headerEditing} rows={2} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>

          {/* T6：採購里程碑 / 物流（非終態 inline 編輯、onBlur 直接 patch） */}
          <fieldset className="space-y-2 rounded-lg border border-border/40 p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">里程碑 / 物流</legend>
            {po.purchaseType !== 'I' ? (
              <FieldRow label="物流編號">
                <input
                  key={`trk_${po.updatedAt}`}
                  defaultValue={po.domesticTrackingNo ?? ''}
                  maxLength={50}
                  placeholder="例：黑貓 1234567890"
                  disabled={busy || isTerminal}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (po.domesticTrackingNo ?? '')) void patchInline({ domesticTrackingNo: v || null });
                  }}
                  className={`${miniInput} w-full`}
                />
              </FieldRow>
            ) : null}
            {po.purchaseType !== 'I' ? (
              <FieldRow label="付款里程碑">
                <select
                  value={po.paymentMilestone ?? ''}
                  disabled={busy || isTerminal}
                  onChange={(e) => void patchInline({ paymentMilestone: (e.target.value || null) as 'N' | 'D' | null })}
                  className={`${miniInput} w-full`}
                >
                  <option value="">未啟動</option>
                  <option value="N">{PAYMENT_MILESTONE_LABEL.N}</option>
                  <option value="D">{PAYMENT_MILESTONE_LABEL.D}</option>
                </select>
              </FieldRow>
            ) : null}
            <FieldRow label="帳款年月">
              <input
                key={`apm_${po.updatedAt}`}
                type="month"
                defaultValue={po.apMonth ?? ''}
                disabled={busy || isTerminal}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (po.apMonth ?? '')) void patchInline({ apMonth: v || null });
                }}
                className={`${miniInput} w-full`}
              />
            </FieldRow>
            {po.purchaseType === 'I' ? (
              <FieldRow label="報關行">
                <select
                  value={po.customsAgentPartnerId ?? ''}
                  disabled={busy || isTerminal}
                  onChange={(e) => void patchInline({ customsAgentPartnerId: e.target.value || null })}
                  className={`${miniInput} w-full`}
                >
                  <option value="">未指派</option>
                  {customsAgents.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}（{p.code}）</option>
                  ))}
                </select>
              </FieldRow>
            ) : null}
          </fieldset>

          {/* T7：對象與地址（母公司付款/分店收貨/直送現場；null = 跟供應商同） */}
          <fieldset className="space-y-2 rounded-lg border border-border/40 p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">對象與地址</legend>
            <FieldRow label="付款對象">
              <select
                value={po.invoiceToPartnerId ?? ''}
                disabled={busy || isTerminal}
                onChange={(e) => void patchInline({ invoiceToPartnerId: e.target.value || null })}
                className={`${miniInput} w-full`}
              >
                <option value="">跟供應商同（{po.supplierName ?? ''}）</option>
                {allPartners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}（{p.code}）</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="指送對象">
              <select
                value={po.shipToPartnerId ?? ''}
                disabled={busy || isTerminal}
                onChange={(e) => void patchInline({ shipToPartnerId: e.target.value || null, shipToAddressId: null })}
                className={`${miniInput} w-full`}
              >
                <option value="">跟供應商同（{po.supplierName ?? ''}）</option>
                {allPartners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}（{p.code}）</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="收貨地址">
              <select
                value={po.shipToAddressId ?? ''}
                disabled={busy || isTerminal || shipToAddresses.length === 0}
                onChange={(e) => void patchInline({ shipToAddressId: e.target.value || null })}
                className={`${miniInput} w-full`}
              >
                <option value="">使用預設地址</option>
                {shipToAddresses.map((a) => (
                  <option key={a.id} value={a.id}>{a.label ?? '(無標籤)'}{a.isDefault ? ' ⭐' : ''}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="直送現場">
              <input
                key={`da_${po.updatedAt}`}
                defaultValue={po.deliveryAddress ?? ''}
                maxLength={200}
                placeholder="例：台北市信義區工地 A 棟"
                disabled={busy || isTerminal}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (po.deliveryAddress ?? '')) void patchInline({ deliveryAddress: v || null });
                }}
                className={`${miniInput} w-full`}
              />
            </FieldRow>
          </fieldset>
        </section>

        {/* 右：明細 */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity ${mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''}`}>
          <PoItemsTable
            items={po.items ?? []}
            subtotal={po.subtotal}
            taxAmount={po.taxAmount}
            totalAmount={po.totalAmount}
            taxRate={Number(po.taxRate) || 0}
            editable={itemsEditing}
            canCancelRemain={canCancelRemain && mode === 'browse'}
            busy={busy}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
            onRemoveItem={async (itemId) => {
              try {
                await removePoItem(id, itemId);
                await reloadAll();
              } catch (e) {
                alert(e instanceof Error ? e.message : '刪除失敗');
              }
            }}
            onCancelRemain={async (it) => {
              const remain = remainOf(it);
              if (!window.confirm(`取消 ${it.partNo} 的剩餘 ${remain} 個？\n（設定後本筆不能再轉進貨、採購單可走結案）`)) return;
              void handle(() => patchPoItem(id, it.id, { cancelledQty: Number(it.cancelledQty || 0) + remain }), '取消剩餘');
            }}
            editingItemId={itemsEditing ? editingItemId : null}
            renderEditRow={(it) => (
              <PoInlineItemRow poId={po.id} editItem={it} onSaved={reloadAll} onExit={() => setEditingItemId(null)} />
            )}
            appendRow={
              itemsEditing && manualAdd ? (
                <PoInlineItemRow poId={po.id} onSaved={reloadAll} onExit={() => setManualAdd(false)} />
              ) : null
            }
          />
        </section>
      </div>

      {rejectOpen ? (
        <RejectDialog
          docNo={po.docNo}
          busy={busy}
          onClose={() => setRejectOpen(false)}
          onConfirm={(reason) => {
            setRejectOpen(false);
            void handle(() => rejectPo(id, reason), '退件');
          }}
        />
      ) : null}

      {toRrOpen ? (
        <PoToRrDialog
          po={po}
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

/** 退件對話框（主管填原因、業務員會看到後修改重送） */
function RejectDialog({
  docNo,
  busy,
  onClose,
  onConfirm,
}: {
  docNo: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl">
        <h2 className="text-sm font-semibold">退件採購單　<span className="font-mono text-muted-foreground">{docNo}</span></h2>
        <p className="text-xs text-muted-foreground">填寫退件原因、開單人會看到此訊息、修改後重新送審。</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="例：單價超出本月預算上限、請改為 NET60 付款後再送"
          className="w-full rounded border bg-background px-2 py-1 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="rounded bg-amber-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            確定退件
          </button>
        </div>
      </div>
    </div>
  );
}

/** 轉進貨對話框：收貨倉 + 勾行/收量/庫位 → poToRr → 跳新進貨單
 *  🔎 修舊版 bug：後端 toRr 每行必填 locationId、舊 dialog 沒有庫位欄位（送出必 400） */
function PoToRrDialog({
  po,
  onClose,
  onDone,
}: {
  po: Po;
  onClose: () => void;
  onDone: (rrId: string) => void;
}) {
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [locs, setLocs] = useState<LocOpt[]>([]);
  const [checked, setChecked] = useState<Set<string>>(() => {
    const c = new Set<string>();
    (po.items ?? []).forEach((it) => {
      if (remainOf(it) > 0) c.add(it.id);
    });
    return c;
  });
  const [qtys, setQtys] = useState<Record<string, string>>(() => {
    const q: Record<string, string> = {};
    (po.items ?? []).forEach((it) => {
      q[it.id] = String(Math.max(0, remainOf(it)));
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
    void (async () => {
      try {
        const res = await listLocation({ page: 1, pageSize: 200, warehouseId, isActive: true });
        setLocs(res.items.map((l) => ({ id: l.id, code: l.code })));
        setLineLocs({});
      } catch {
        setLocs([]);
      }
    })();
  }, [warehouseId]);

  async function doConvert() {
    setErr(null);
    if (!warehouseId) {
      setErr('請先選收貨倉庫');
      return;
    }
    const rows = (po.items ?? [])
      .filter((it) => checked.has(it.id))
      .map((it) => ({ poItemId: it.id, qty: Number(qtys[it.id]) || 0, locationId: lineLocs[it.id] || '' }))
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
      const created = await poToRr(po.id, { warehouseId, items: rows });
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
          <h2 className="text-sm font-semibold">轉進貨　<span className="font-mono text-muted-foreground">{po.docNo}</span></h2>
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
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2 text-left">料號</th>
                <th className="px-2 py-2 text-left">品名</th>
                <th className="px-2 py-2 text-right">可收</th>
                <th className="px-2 py-2 text-right">本次收量</th>
                <th className="px-2 py-2 text-left">入庫庫位</th>
              </tr>
            </thead>
            <tbody>
              {(po.items ?? []).map((it) => {
                const remain = remainOf(it);
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
                    <td className="px-2 py-1.5 font-mono text-xs">{it.partNo}</td>
                    <td className="px-2 py-1.5">{it.partName}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{remain}</td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">建立草稿進貨單後會跳轉到該單；收量不可超過剩餘可收（伺服器把關）。</p>
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

/**
 * 內嵌明細列（新增 + 編輯共用）
 *  新增：料號 picker + 數量 + 單價（+預交貨/備註）→ addPoItem
 *  編輯：數量 / 單價 / 預交貨 / 備註（料號鎖定）。Enter 存檔、Esc 退出。
 */
function PoInlineItemRow({
  poId,
  editItem,
  onSaved,
  onExit,
}: {
  poId: string;
  editItem?: PoItem;
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const [part, setPart] = useState<PickedPart | null>(null);
  const [qty, setQty] = useState(String(editItem?.qty ?? '1'));
  const [cost, setCost] = useState(String(editItem?.unitCost ?? ''));
  const [expected, setExpected] = useState(editItem?.expectedDate?.slice(0, 10) ?? '');
  const [rmk, setRmk] = useState(editItem?.remark ?? '');
  const [busy, setBusy] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);
  const partRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editItem) qtyRef.current?.focus();
    else partRef.current?.focus();
  }, [editItem]);

  const commit = async () => {
    if (busy) return; // 防連按 Enter 重複送出
    if (Number(qty) <= 0) {
      qtyRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (editItem) {
        await patchPoItem(poId, editItem.id, {
          qty: Number(qty),
          unitPriceSnapshot: Number(cost) || 0,
          expectedDate: expected || null,
          remark: rmk.trim() || null,
        });
        await onSaved();
        onExit();
      } else {
        if (!part) {
          partRef.current?.focus();
          setBusy(false);
          return;
        }
        await addPoItem(poId, {
          partId: part.id,
          qty: Number(qty),
          unitPriceSnapshot: Number(cost) || 0,
          expectedDate: expected || undefined,
          remark: rmk.trim() || undefined,
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
          <span className="font-mono text-xs">{editItem.partNo}　{editItem.partName}</span>
        ) : (
          <PartPicker inputRef={partRef} onPick={setPart} />
        )}
      </td>
      <td className="px-2 py-1">
        <input ref={qtyRef} type="number" min="0" step="1" value={qty} onFocus={selectAll} onChange={(e) => setQty(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
      </td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{editItem ? Number(editItem.receivedQty || 0) : '—'}</td>
      <td className="px-2 py-1">
        <input type="number" min="0" step="0.01" value={cost} onFocus={selectAll} onChange={(e) => setCost(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-right tabular-nums`} />
      </td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineAmount)}</td>
      <td className="px-2 py-1">
        <input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} onKeyDown={enterCommit} className={`${cell} text-xs`} />
      </td>
      <td className="px-2 py-1">
        <input value={rmk} onChange={(e) => setRmk(e.target.value)} onKeyDown={enterCommit} placeholder="備註" className={`${cell} text-xs`} />
      </td>
      <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">Enter↵ / Esc</td>
    </tr>
  );
}

/** PO 明細表（純呈現）：料號(+廠牌小字)/品名/採購量/已收(取消小字+取消剩餘)/單價/金額/預交貨/備註 */
function PoItemsTable({
  items,
  subtotal,
  taxAmount,
  totalAmount,
  taxRate,
  editable,
  canCancelRemain,
  busy,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  onCancelRemain,
  editingItemId,
  renderEditRow,
  appendRow,
}: {
  items: PoItem[];
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  taxRate: number;
  editable: boolean;
  canCancelRemain: boolean;
  busy: boolean;
  selectedItemId: string | null;
  onSelectItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  onCancelRemain?: (it: PoItem) => void;
  editingItemId?: string | null;
  renderEditRow?: (it: PoItem) => React.ReactNode;
  appendRow?: React.ReactNode;
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
  const pad = Math.max(0, fitRows - items.length - (appendRow ? 1 : 0));
  return (
    <div ref={scrollRef} className="flex-1 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-border/60 [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border/60">
        <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">序號</th>
            <th className="px-3 py-2 text-left">料號</th>
            <th className="px-3 py-2 text-left">品名</th>
            <th className="px-3 py-2 text-right">採購量</th>
            <th className="px-3 py-2 text-right">已收量</th>
            <th className="px-3 py-2 text-right">單價</th>
            <th className="px-3 py-2 text-right">金額</th>
            <th className="px-3 py-2 text-left">預交貨</th>
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
            const cancelled = Number(it.cancelledQty || 0);
            const remain = remainOf(it);
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
                <td className="px-3 py-2 text-right tabular-nums">
                  <div>{Number(it.receivedQty || 0)}</div>
                  {cancelled > 0 ? <div className="mt-0.5 text-[10px] text-amber-600" title="已取消量">取消 {cancelled}</div> : null}
                  {canCancelRemain && remain > 0 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelRemain?.(it);
                      }}
                      className="mt-1 text-[10px] text-amber-600 underline decoration-dotted hover:text-amber-500 disabled:opacity-40"
                      title="把剩餘可收量設為已取消、不再期待廠商出貨（缺貨/部分到貨收尾用）"
                    >
                      取消剩餘 ({remain})
                    </button>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(it.unitCost)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(it.lineAmount)}</td>
                <td className="px-3 py-2 text-xs">{it.expectedDate ? it.expectedDate.slice(0, 10) : '—'}</td>
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

/**
 * 新增採購單面板（內嵌）：
 *  手動：供應商(S) + 採購日期 + 類型 + 稅率 + 首行明細（料號/數量/單價；後端 create 要求至少 1 行）
 *  從詢價單（僅 ?rfq= 入口）：帶「已回覆且有單價」的行（含 rfqItemId 回鏈）
 */
export function PoCreatePanel({
  onCreated,
  onCancel,
  initialRfqId,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
  initialRfqId?: string;
}) {
  const [source, setSource] = useState<'manual' | 'rfq'>(initialRfqId ? 'rfq' : 'manual');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [supplier, setSupplier] = useState<PickedCustomer | null>(null);
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchaseType, setPurchaseType] = useState<'D' | 'I' | 'B'>('D');
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');
  const [part, setPart] = useState<PickedPart | null>(null);
  const [firstQty, setFirstQty] = useState('1');
  const [firstCost, setFirstCost] = useState('');

  // rfq 路徑
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [rfqChecked, setRfqChecked] = useState<Set<string>>(new Set());
  const [rfqQtys, setRfqQtys] = useState<Record<string, string>>({});

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

  async function doSave() {
    setErr(null);
    setBusy(true);
    try {
      if (source === 'rfq') {
        if (!rfq) throw new Error('詢價單載入中');
        if (!rfq.supplierId) throw new Error('此詢價單無供應商、無法轉採購');
        const rows = (rfq.items ?? [])
          .filter((it) => rfqChecked.has(it.id) && it.status === 'R' && it.unitPrice != null)
          .map((it) => ({
            partId: it.partId,
            qty: Number(rfqQtys[it.id]) || 0,
            unitPriceSnapshot: Number(it.unitPrice) || 0,
            rfqItemId: it.id,
          }))
          .filter((r) => r.qty > 0);
        if (!rows.length) throw new Error('請至少勾一行且數量 > 0');
        const created = await createPo({
          poDate,
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
        if (!(Number(firstQty) > 0)) throw new Error('首行數量須 > 0');
        const created = await createPo({
          poDate,
          supplierId: supplier.id,
          purchaseType,
          taxRate: Number(taxRate) || 0,
          remark: remark.trim() || undefined,
          items: [{ partId: part.id, qty: Number(firstQty), unitPriceSnapshot: Number(firstCost) || 0 }],
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
  const canSave = source === 'rfq' ? !!rfq : !!supplier && !!part;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ToolbarPortal>
        <div data-nx-frame className="flex items-center gap-1 border-b border-border/40 px-3 py-2" style={TOOLBAR_STYLE}>
          <ToolbarButton icon={Save} letter="S" label="存檔" enabled={canSave && !busy} accent onClick={() => void doSave()} />
          <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={onCancel} />
          <div className="flex-1" />
          <span className="px-1 text-[11px] text-muted-foreground">新增採購單</span>
        </div>
      </ToolbarPortal>

      {err ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[440px]">
          <FieldRow label="單號"><input readOnly value="存檔後產生" className={roCls} /></FieldRow>
          {initialRfqId ? (
            <FieldRow label="建立方式">
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1"><input type="radio" checked={source === 'rfq'} onChange={() => setSource('rfq')} />從詢價單</label>
                <label className="flex items-center gap-1"><input type="radio" checked={source === 'manual'} onChange={() => setSource('manual')} />手動建立</label>
              </div>
            </FieldRow>
          ) : null}
          {source === 'rfq' ? (
            <>
              <FieldRow label="來源詢價單"><input readOnly value={rfq ? rfq.docNo : '載入中…'} className={`${roCls} font-mono`} /></FieldRow>
              <FieldRow label="供應商"><input readOnly value={rfq ? `${rfq.supplierCode ?? ''}　${rfq.supplierName ?? rfq.supplierId ?? ''}` : ''} className={roCls} /></FieldRow>
            </>
          ) : (
            <>
              <FieldRow label="供應商"><CustomerPicker partnerType="S" onPick={setSupplier} onCommit={() => {}} autoFocus /></FieldRow>
              <FieldRow label="採購類型">
                <select value={purchaseType} onChange={(e) => setPurchaseType(e.target.value as 'D' | 'I' | 'B')} className={inputCls}>
                  <option value="D">D 國內</option>
                  <option value="I">I 國外</option>
                  <option value="B">B 掃貨</option>
                </select>
              </FieldRow>
            </>
          )}
          <FieldRow label="採購日期"><input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="稅率 %"><input type="number" min="0" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="備註"><input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} /></FieldRow>
          {source === 'manual' ? (
            <div className="rounded border border-border/40 bg-muted/20 p-2">
              <div className="mb-1 text-xs text-muted-foreground">首行明細（建單至少一行、之後可再加）：</div>
              <div className="space-y-2">
                <PartPicker onPick={setPart} />
                <div className="flex gap-2">
                  <input type="number" min="1" step="1" value={firstQty} onChange={(e) => setFirstQty(e.target.value)} placeholder="數量" className={`${inputCls} text-right`} />
                  <input type="number" min="0" step="0.01" value={firstCost} onChange={(e) => setFirstCost(e.target.value)} placeholder="單價" className={`${inputCls} text-right`} />
                </div>
              </div>
            </div>
          ) : (
            <p className="pt-1 text-[11px] text-muted-foreground">只帶「已回覆且有單價」的詢價明細；右側勾要採購的行、可調數量。</p>
          )}
        </section>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-border">
          {source === 'rfq' && rfq ? (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-left">料號</th>
                  <th className="px-2 py-2 text-left">品名</th>
                  <th className="px-2 py-2 text-right">詢價量</th>
                  <th className="px-2 py-2 text-right">採購量</th>
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
                      <td className="px-2 py-1.5 font-mono text-xs">{it.partNo}</td>
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
                      <td className="px-2 py-1.5 text-right tabular-nums">{it.unitPrice != null ? fmt(it.unitPrice) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              {source === 'rfq' ? '詢價單載入中…' : '手動建立：左側填供應商與首行明細，存檔後進入明細編輯可繼續加行。'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** NX-DOC-PRINT：採購單列印設定（DocPrintView 皮） */
function PoPrintSheet({ doc, onClose }: { doc: Po; onClose: () => void }) {
  return (
    <DocPrintView
      title="採　購　單"
      docNo={doc.docNo}
      fields={[
        { label: '單號', value: doc.docNo },
        { label: '採購日期', value: doc.poDate.slice(0, 10) },
        { label: '供應商編號', value: doc.supplierCode ?? '' },
        { label: '供應商名稱', value: doc.supplierName ?? '' },
        { label: '採購類型', value: PURCHASE_TYPE_LABEL[doc.purchaseType ?? 'D'] ?? '' },
        { label: '預計到貨', value: doc.expectedDate ? doc.expectedDate.slice(0, 10) : '' },
        { label: '來源詢價單', value: doc.rfqDocNo ?? '' },
        { label: '幣別 / 稅率', value: `${doc.currencyId} / ${Number(doc.taxRate)}%` },
      ]}
      columns={[
        { label: '序', width: '6%', align: 'center', render: (it) => it.lineNo },
        {
          label: '料號', width: '18%',
          render: (it) => (
            <span className="font-mono">
              {it.partNo}
              {it.secCode ? <><br /><span className="text-neutral-500">{it.secCode}</span></> : null}
            </span>
          ),
        },
        { label: '品名', render: (it) => it.partName },
        { label: '數量', width: '8%', align: 'right', render: (it) => Number(it.qty) },
        { label: '單價', width: '11%', align: 'right', render: (it) => printMoney(it.unitCost) },
        { label: '金額', width: '12%', align: 'right', render: (it) => printMoney(it.lineAmount) },
        { label: '預交貨', width: '11%', render: (it) => (it.expectedDate ? it.expectedDate.slice(0, 10) : '') },
        { label: '備註', width: '12%', render: (it) => it.remark ?? '' },
      ]}
      items={doc.items ?? []}
      getRowKey={(it) => it.id}
      totals={[
        { label: '未稅金額', value: printMoney(doc.subtotal) },
        { label: `稅額（${Number(doc.taxRate)}%）`, value: printMoney(doc.taxAmount) },
        { label: '總計', value: printMoney(doc.totalAmount), strong: true },
      ]}
      note={doc.remark}
      signatures={['採購', '核准主管', '廠商確認']}
      onClose={onClose}
    />
  );
}
