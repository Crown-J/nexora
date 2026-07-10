// apps/nx-ui/src/features/nx04/so/ui/SoDetailView.new.tsx
// NX04-QT-SHELL：銷貨單詳情面板（比照報價單模板 QuoteDetailView 的左右兩塊 + 三狀態工作列）
//   左＝表頭 Form（SO 欄位）／右＝明細 Table（tfoot 金額結算）
//   三狀態工作列：瀏覽 / 編輯表頭 / 編輯明細（內嵌 Excel 式加改刪 + 從報價拉行）
//   SO 專屬：明細新增自動帶 header 出貨倉庫；明細編輯只改量價（料號不可改）；從報價＝open quote lines
'use client';

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileClock,
  Pencil,
  Handshake,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { DocPrintView, printMoney } from '@/features/shared/doc-shell/DocPrintView';

import {
  addSoItem,
  createSo,
  getSo,
  listOpenQuoteLines,
  patchSoItem,
  removeSoItem,
  softDeleteSo,
  updateSo,
} from '@data/endpoints/nx04/so/api/so';
import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import type { OpenQuoteLine, So, SoItem } from '@data/types/nx04/so';
import { SO_STATUS_LABEL, type SoStatus } from '@data/types/nx04/so';

import { CustomerPicker, type PickedCustomer } from '../../quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '../../quote/ui/PartPicker';
// NX02-TI-SHELL 2026-07-11：同行調貨入口接回新殼（缺貨行群組建 TI、建完跳 TI 詳情）
import { CreateTiFromSoModal } from './CreateTiFromSoModal';
// W5-ISSUE-CHAIN Step 5 2026-07-11：問題回報孤兒按鈕復活（單據外殼改版時掉的掛載點）
import { IssueReportModal } from '@/features/shared/issue-report-trigger';

const DELIVERY_LABEL: Record<string, string> = { P: '自取', D: '配送', S: '寄送' };
const EDITABLE_STATUS: SoStatus[] = ['DRAFT'];
const CANCELABLE_STATUS: SoStatus[] = ['DRAFT', 'CONFIRMED'];
const fmt = (n: string | number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

export function SoDetailPanel({
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
  const [so, setSo] = useState<So | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  // NX02-TI-SHELL：同行調貨 modal（缺貨行 → 建 TI）
  const [tiModalOpen, setTiModalOpen] = useState(false);
  // W5-ISSUE-CHAIN Step 5：問題回報 modal
  const [irModalOpen, setIrModalOpen] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [addMode, setAddMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [quotePickerOpen, setQuotePickerOpen] = useState(false);
  const [selItem, setSelItem] = useState<string | null>(null);

  // 表頭可編欄位
  const [soDate, setSoDate] = useState('');
  const [deliveryType, setDeliveryType] = useState('P');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSo(await getSo(id));
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
    if (!so) return;
    setSoDate(so.soDate.slice(0, 10));
    setDeliveryType(so.deliveryType || 'P');
    setRemark(so.remark ?? '');
  }, [so?.id, so?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

  // 建單後（initialMode=editItems）→ 自動進內嵌新增
  const autoAddRef = useRef(false);
  useEffect(() => {
    if (initialMode === 'editItems' && so && !autoAddRef.current) {
      autoAddRef.current = true;
      setAddMode(true);
    }
  }, [so, initialMode]);

  // 明細預設選第一列
  useEffect(() => {
    const its = so?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [so, selItem]);

  // 明細 ↑↓ 選列
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (quotePickerOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = so?.items ?? [];
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
  }, [so, selItem, quotePickerOpen]);

  // 編輯明細 Alt 快捷
  useEffect(() => {
    if (mode !== 'editItems') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (addMode || editingItemId)) {
        e.preventDefault();
        setAddMode(false);
        setEditingItemId(null);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const map: Record<string, () => void> = {
        a: () => {
          setEditingItemId(null);
          setAddMode(true);
        },
        f: () => setQuotePickerOpen(true),
        e: () => {
          if (selItem) {
            setAddMode(false);
            setEditingItemId(selItem);
          }
        },
        d: () => void removeSelectedItem(),
        s: () => {
          setAddMode(false);
          setEditingItemId(null);
          setMode('browse');
        },
        c: () => {
          setAddMode(false);
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
  }, [mode, addMode, editingItemId, selItem]);

  useEffect(() => {
    if (mode !== 'editItems') {
      setAddMode(false);
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

  if (loading && !so) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !so) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!so) return null;

  const statusEditable = EDITABLE_STATUS.includes(so.status) && !so.cancelledAt;
  const canCancel = CANCELABLE_STATUS.includes(so.status) && !so.cancelledAt;
  const headerEditing = mode === 'editHeader' && statusEditable;
  const itemsEditable = mode === 'editItems' && statusEditable;

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateSo(id, { soDate, deliveryType, remark });
      setMode('editItems');
      await reloadAll();
    } catch (e) {
      setError(`存檔: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (so) {
      setSoDate(so.soDate.slice(0, 10));
      setDeliveryType(so.deliveryType || 'P');
      setRemark(so.remark ?? '');
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
      await removeSoItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
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
              <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={statusEditable && !busy} onClick={() => setMode('editHeader')} />
              <ToolbarButton
                icon={Trash2}
                letter="D"
                label="取消"
                enabled={canCancel && !busy}
                variant="danger"
                onClick={() => {
                  const reason = window.prompt('取消（作廢）原因（必填）');
                  if (!reason?.trim()) return;
                  void handle(() => softDeleteSo(id, reason.trim()), '取消');
                }}
              />
              <ToolbarSeparator />
              {/* NX02-TI-SHELL：缺貨行 → 同行調貨（modal 內列 transferSourceType=G 待補行） */}
              <ToolbarButton icon={Handshake} label="同行調貨" enabled={!busy} onClick={() => setTiModalOpen(true)} />
              {/* W5-ISSUE-CHAIN Step 5：問題回報 → 統一異常登記簿 */}
              <ToolbarButton icon={AlertTriangle} label="問題回報" enabled={!busy} onClick={() => setIrModalOpen(true)} />
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
              <ToolbarButton icon={Plus} letter="A" label="新增項目" enabled={itemsEditable} pressed={addMode} onClick={() => { setEditingItemId(null); setAddMode(true); }} />
              <ToolbarButton icon={FileClock} letter="F" label="從報價" enabled={itemsEditable} onClick={() => setQuotePickerOpen(true)} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯項目" enabled={itemsEditable && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) { setAddMode(false); setEditingItemId(selItem); } }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditable && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
        </div>
      </ToolbarPortal>

      {printOpen && so ? <SoPrintSheet doc={so} onClose={() => setPrintOpen(false)} /> : null}

      {tiModalOpen && so ? (
        <CreateTiFromSoModal
          soId={so.id}
          docNo={so.docNo}
          onClose={() => setTiModalOpen(false)}
          onCreated={(resp) => {
            setTiModalOpen(false);
            router.push(`/dashboard/purchase/ti/${encodeURIComponent(resp.tiId)}`);
          }}
        />
      ) : null}

      {irModalOpen && so ? (
        <IssueReportModal
          sourceDocType="SO"
          sourceDocId={so.id}
          sourceDocNo={so.docNo}
          warehouseId={so.warehouseId}
          partOptions={(so.items ?? []).map((it) => ({ partId: it.partId, partNo: it.partNo, partName: it.partName }))}
          onClose={() => setIrModalOpen(false)}
        />
      ) : null}

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[420px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <FieldRow label="單號"><input readOnly value={so.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={SO_STATUS_LABEL[so.status] ?? so.status} className={roCls} /></FieldRow>
          <FieldRow label="銷貨日期"><input type="date" value={soDate} onChange={(e) => setSoDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="客戶編號"><input readOnly value={so.customerCode ?? so.customerId} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="客戶名稱"><input readOnly value={so.customerName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="幣別"><input readOnly value={so.currencyCode ?? so.currencyId} className={roCls} /></FieldRow>
          <FieldRow label="出貨倉庫"><input readOnly value={so.warehouseName ? `${so.warehouseCode ?? ''}　${so.warehouseName}` : (so.warehouseCode ?? so.warehouseId)} className={roCls} /></FieldRow>
          <FieldRow label="交貨方式">
            {headerEditing ? (
              <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className={inputCls}>
                <option value="P">自取</option>
                <option value="D">配送</option>
                <option value="S">寄送</option>
              </select>
            ) : (
              <input readOnly value={DELIVERY_LABEL[so.deliveryType] ?? so.deliveryType} className={roCls} />
            )}
          </FieldRow>
          <FieldRow label="業務員"><input readOnly value={so.salesPersonName ?? '—'} className={roCls} /></FieldRow>
          <FieldRow label="建單人員"><input readOnly value={so.createdByName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={so.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!headerEditing} rows={3} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>
        </section>

        {/* 右：明細 */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity ${mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''}`}>
          <SoItemsSection
            so={so}
            items={so.items ?? []}
            editable={itemsEditable}
            onChanged={reloadAll}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
            addMode={itemsEditable && addMode}
            onExitAdd={() => setAddMode(false)}
            editingItemId={itemsEditable ? editingItemId : null}
            onExitEdit={() => setEditingItemId(null)}
          />
        </section>
      </div>

      {quotePickerOpen ? (
        <SoQuoteLinePicker
          customerId={so.customerId}
          customerName={so.customerName}
          onClose={() => setQuotePickerOpen(false)}
          onConfirm={async (lines) => {
            setQuotePickerOpen(false);
            try {
              for (const l of lines) {
                await addSoItem(so.id, {
                  partId: l.partId,
                  warehouseId: so.warehouseId,
                  qty: Number(l.remainQty) || Number(l.qty) || 1,
                  unitPriceSnapshot: Number(l.unitPrice) || 0,
                  quoteItemId: l.quoteItemId,
                });
              }
              await reloadAll();
            } catch (e) {
              alert(e instanceof Error ? e.message : '帶入失敗');
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

/** 新增銷貨單面板（內嵌、無彈窗）：停客戶編號 → 存檔確認 → 建單 → 進編輯明細 */
export function SoCreatePanel({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [soDate, setSoDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryType, setDeliveryType] = useState('P');
  const [remark, setRemark] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const deliveryRef = useRef<HTMLSelectElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmOpen) confirmRef.current?.focus();
  }, [confirmOpen]);

  async function doSave() {
    if (!customer) {
      setErr('請先選客戶');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const so = await createSo({
        customerId: customer.id,
        soDate,
        deliveryType,
        warehouseId: customer.defaultWarehouseId ?? undefined,
        taxRate: 5,
        remark: remark.trim() || undefined,
      });
      onCreated(so.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-muted-foreground';
  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ToolbarPortal>
        <div data-nx-frame className="flex items-center gap-1 border-b border-border/40 px-3 py-2" style={TOOLBAR_STYLE}>
          <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!!customer && !busy} accent onClick={() => setConfirmOpen(true)} />
          <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={onCancel} />
          <div className="flex-1" />
          <span className="px-1 text-[11px] text-muted-foreground">新增銷貨單</span>
        </div>
      </ToolbarPortal>

      {err ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號"><input readOnly value="存檔後產生" className={roCls} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value="新建" className={roCls} /></FieldRow>
          <FieldRow label="銷貨日期"><input type="date" value={soDate} onChange={(e) => setSoDate(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="客戶編號">
            <CustomerPicker autoFocus onPick={setCustomer} onCommit={() => deliveryRef.current?.focus()} />
          </FieldRow>
          <FieldRow label="客戶名稱"><input readOnly value={customer?.name ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="交貨方式">
            <select
              ref={deliveryRef}
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customer) setConfirmOpen(true);
                }
              }}
              className={inputCls}
            >
              <option value="P">自取</option>
              <option value="D">配送</option>
              <option value="S">寄送</option>
            </select>
          </FieldRow>
          <FieldRow label="備註"><input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} /></FieldRow>
          <p className="pt-1 text-[11px] text-muted-foreground">出貨倉庫：存檔時自動帶（客戶預設倉→使用者隸屬倉→主倉）。</p>
        </section>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SoItemsTable items={[]} taxRate={5} subtotal={0} taxAmount={0} totalAmount={0} editable={false} selectedItemId={null} />
        </section>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-sm font-semibold">確認建立銷貨單</h2>
            <p className="text-sm text-muted-foreground">
              客戶：{customer?.code}　{customer?.name}
              <br />
              存檔後將產生單號，並可開始編輯明細。
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded border px-4 py-1.5 text-sm">取消</button>
              <button ref={confirmRef} type="button" disabled={busy} onClick={() => void doSave()} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
                {busy ? '建立中…' : '確認 (Enter)'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SoItemsSection({
  so,
  items,
  editable,
  onChanged,
  selectedItemId,
  onSelectItem,
  addMode,
  onExitAdd,
  editingItemId,
  onExitEdit,
}: {
  so: So;
  items: SoItem[];
  editable: boolean;
  onChanged: () => void | Promise<void>;
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  addMode?: boolean;
  onExitAdd?: () => void;
  editingItemId?: string | null;
  onExitEdit?: () => void;
}) {
  const handleRemove = async (itemId: string) => {
    try {
      await removeSoItem(so.id, itemId);
      await onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    }
  };
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <SoItemsTable
        items={items}
        taxRate={Number(so.taxRate) || 0}
        subtotal={so.subtotal}
        taxAmount={so.taxAmount}
        totalAmount={so.totalAmount}
        editable={editable}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        onRemoveItem={handleRemove}
        editingItemId={editable ? editingItemId : null}
        renderEditRow={(it) => (
          <SoInlineItemRow
            so={so}
            taxRate={Number(so.taxRate) || 0}
            nextLineNo={it.lineNo}
            editItem={it}
            onSaved={onChanged}
            onExit={onExitEdit ?? (() => {})}
          />
        )}
        addRow={
          editable && addMode ? (
            <SoInlineItemRow
              so={so}
              taxRate={Number(so.taxRate) || 0}
              nextLineNo={(items[items.length - 1]?.lineNo ?? 0) + 1}
              onSaved={onChanged}
              onExit={onExitAdd ?? (() => {})}
            />
          ) : null
        }
      />
    </section>
  );
}

/** 內嵌明細列：新增＝料號→數量→單價；編輯＝料號鎖定只改量價（SO 明細不可換料號）。Enter 逐格、末格存檔、ESC 退出。 */
function SoInlineItemRow({
  so,
  taxRate,
  nextLineNo,
  editItem,
  onSaved,
  onExit,
}: {
  so: So;
  taxRate: number;
  nextLineNo: number;
  editItem?: SoItem;
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const isEdit = !!editItem;
  const partFromItem = (it: SoItem): PickedPart => ({
    id: it.partId,
    code: it.partNo,
    name: it.partName,
    secCode: null,
    brandName: it.brandName ?? null,
    availableTotal: '0',
    onHandTotal: '0',
  });
  const [part, setPart] = useState<PickedPart | null>(editItem ? partFromItem(editItem) : null);
  const [qty, setQty] = useState(editItem ? String(editItem.qty) : '1');
  const [price, setPrice] = useState(editItem ? String(editItem.unitPrice) : '');
  const [busy, setBusy] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  // 偉盟設計檢視 P1-5：替代出貨（編輯模式限定）。undefined=未動、null=清除、string=新選料 id
  const [actualTouch, setActualTouch] = useState<string | null | undefined>(undefined);
  const [actualKey, setActualKey] = useState(0);
  const partRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit) qtyRef.current?.focus();
    else partRef.current?.focus();
  }, [isEdit]);

  const pickPart = async (p: PickedPart) => {
    setPart(p);
    setTimeout(() => qtyRef.current?.focus(), 0);
    try {
      const intel = await getQuotePriceIntel(so.customerId, p.id);
      const cq = intel.sameCustomerQuote;
      const cs = intel.sameCustomerSale;
      const recent = cq && cs ? (cq.date >= cs.date ? cq : cs) : (cq ?? cs);
      setPrice(recent?.amount ?? intel.suggestedPrice ?? '');
    } catch {
      /* 查不到不擋 */
    }
  };

  const reset = () => {
    setPart(null);
    setQty('1');
    setPrice('');
    setPickerKey((k) => k + 1);
    setTimeout(() => partRef.current?.focus(), 0);
  };

  const commit = async () => {
    if (!part || Number(qty) <= 0 || Number(price) < 0) {
      (isEdit ? qtyRef : partRef).current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (isEdit && editItem) {
        await patchSoItem(so.id, editItem.id, {
          qty: Number(qty),
          unitPriceSnapshot: Number(price),
          // 偉盟設計檢視 P1-5：替代出貨有動才送（null=清除）
          ...(actualTouch !== undefined ? { actualPartId: actualTouch } : {}),
        });
        await onSaved();
        onExit();
      } else {
        await addSoItem(so.id, {
          partId: part.id,
          warehouseId: so.warehouseId,
          qty: Number(qty),
          unitPriceSnapshot: Number(price),
        });
        await onSaved();
        reset();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : isEdit ? '修改失敗' : '新增失敗');
    } finally {
      setBusy(false);
    }
  };

  const lineSub = (Number(qty) || 0) * (Number(price) || 0);
  const lineTax = Math.round((lineSub * taxRate) / 100);
  const cell = 'w-full rounded border border-primary/40 bg-background px-2 py-1 text-sm tabular-nums';
  const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  return (
    <tr
      className={isEdit ? 'bg-amber-400/10' : 'bg-primary/[0.06]'}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onExit();
        }
      }}
    >
      <td className="px-3 py-1 text-xs text-primary">{isEdit ? editItem!.lineNo : nextLineNo}</td>
      <td className="px-2 py-1" colSpan={3} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); qtyRef.current?.focus(); } }}>
        {isEdit ? (
          <div className="space-y-1">
            <div className="font-mono text-xs">{editItem!.partNo}　{editItem!.partName}</div>
            {/* 偉盟設計檢視 P1-5：替代出貨（實際出貨料號、可空；清除=照下單料號出） */}
            <div className="flex items-center gap-1">
              <span className="shrink-0 text-[10px] text-muted-foreground">替代出貨：</span>
              <div className="min-w-0 flex-1">
                <PartPicker
                  key={`ap_${actualKey}`}
                  initialText={actualTouch === null ? '' : (editItem!.actualPartNo ?? '')}
                  onPick={(p) => setActualTouch(p.id)}
                />
              </div>
              {actualTouch !== null && (actualTouch || editItem!.actualPartNo) ? (
                <button
                  type="button"
                  onClick={() => {
                    setActualTouch(null);
                    setActualKey((k) => k + 1);
                  }}
                  className="shrink-0 text-[10px] text-rose-600 hover:underline"
                >
                  清除
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <PartPicker key={pickerKey} inputRef={partRef} onPick={(p) => void pickPart(p)} />
        )}
      </td>
      <td className="px-2 py-1">
        <input
          ref={qtyRef}
          type="number"
          min="0"
          step="1"
          value={qty}
          onFocus={selectAll}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); priceRef.current?.focus(); } }}
          className={`${cell} text-right`}
        />
      </td>
      <td className="px-2 py-1">
        <input
          ref={priceRef}
          type="number"
          min="0"
          step="0.01"
          value={price}
          onFocus={selectAll}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void commit(); } }}
          disabled={busy}
          className={`${cell} text-right font-medium`}
        />
      </td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineSub)}</td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineTax)}</td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineSub + lineTax)}</td>
      <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">Enter↵ / Esc</td>
    </tr>
  );
}

/** SO 明細表（純呈現，詳情與新增共用）*/
function SoItemsTable({
  items,
  taxRate,
  subtotal,
  taxAmount,
  totalAmount,
  editable,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  addRow,
  editingItemId,
  renderEditRow,
}: {
  items: SoItem[];
  taxRate: number;
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  editable: boolean;
  selectedItemId: string | null;
  onSelectItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  addRow?: React.ReactNode;
  editingItemId?: string | null;
  renderEditRow?: (it: SoItem) => React.ReactNode;
}) {
  const rate = taxRate;
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
  const pad = Math.max(0, fitRows - items.length - (addRow ? 1 : 0));
  return (
    <div ref={scrollRef} className="flex-1 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-border/60 [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border/60">
        <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">序號</th>
            <th className="px-3 py-2 text-left">料號</th>
            <th className="px-3 py-2 text-left">廠牌</th>
            <th className="px-3 py-2 text-left">品名</th>
            <th className="px-3 py-2 text-right">數量</th>
            <th className="px-3 py-2 text-right">單價</th>
            <th className="px-3 py-2 text-right">小計</th>
            <th className="px-3 py-2 text-right">稅額</th>
            <th className="px-3 py-2 text-right">總價</th>
            {editable ? <th className="px-3 py-2"></th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            if (editingItemId && it.id === editingItemId && renderEditRow) {
              return <Fragment key={it.id}>{renderEditRow(it)}</Fragment>;
            }
            const lineSub = Number(it.lineAmount);
            const lineTax = Math.round((lineSub * rate) / 100);
            const lineTotal = lineSub + lineTax;
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
                  {it.partNo}
                  {/* 偉盟設計檢視 P1-5：替代出貨（實際出貨料號 ≠ 下單料號）標示 */}
                  {it.actualPartNo && it.actualPartNo !== it.partNo ? (
                    <span
                      className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800"
                      title={`替代出貨：實際出 ${it.actualPartNo}`}
                    >
                      ⭢ {it.actualPartNo}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">{it.brandName ?? '—'}</td>
                <td className="px-3 py-2">{it.partName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(it.unitPrice)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(lineSub)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(lineTax)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(lineTotal)}</td>
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
          {addRow}
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
            <td className="px-3 py-2 text-right text-xs text-muted-foreground" colSpan={6}>合計</td>
            <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(subtotal)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(taxAmount)}</td>
            <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{fmt(totalAmount)}</td>
            {editable ? <td /> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** 從報價：列出該客戶 OPEN 報價行（remainQty>0），可勾選帶入 SO 明細 */
function SoQuoteLinePicker({
  customerId,
  customerName,
  onClose,
  onConfirm,
}: {
  customerId: string;
  customerName?: string | null;
  onClose: () => void;
  onConfirm: (lines: OpenQuoteLine[]) => void | Promise<void>;
}) {
  const [lines, setLines] = useState<OpenQuoteLine[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLines(await listOpenQuoteLines(customerId));
      } catch (e) {
        setErr(e instanceof Error ? e.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">從報價帶入　<span className="text-muted-foreground">{customerName ?? ''}</span></h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉"><X className="h-4 w-4" /></button>
        </div>
        {err ? <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{err}</div> : null}
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">載入中…</div>
          ) : lines.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">此客戶無可帶入的報價行。</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-left">報價單號</th>
                  <th className="px-2 py-2 text-left">料號</th>
                  <th className="px-2 py-2 text-left">品名</th>
                  <th className="px-2 py-2 text-right">剩餘量</th>
                  <th className="px-2 py-2 text-right">單價</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.quoteItemId} className="cursor-pointer hover:bg-accent/10" onClick={() => toggle(l.quoteItemId)}>
                    <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={checked.has(l.quoteItemId)} readOnly /></td>
                    <td className="px-2 py-1.5 font-mono text-xs">{l.docNo}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{l.partNo}</td>
                    <td className="px-2 py-1.5">{l.partName}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{l.remainQty}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(l.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button
            type="button"
            disabled={checked.size === 0}
            onClick={() => void onConfirm(lines.filter((l) => checked.has(l.quoteItemId)))}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            帶入 {checked.size} 行
          </button>
        </div>
      </div>
    </div>
  );
}

/** NX-DOC-PRINT：銷貨單列印設定（DocPrintView 皮） */
function SoPrintSheet({ doc, onClose }: { doc: So; onClose: () => void }) {
  const delivery: Record<string, string> = { P: '自取', D: '配送', S: '寄送' };
  return (
    <DocPrintView
      title="銷　貨　單"
      docNo={doc.docNo}
      fields={[
        { label: '單號', value: doc.docNo },
        { label: '銷貨日期', value: doc.soDate.slice(0, 10) },
        { label: '客戶編號', value: doc.customerCode ?? '' },
        { label: '客戶名稱', value: doc.customerName ?? '' },
        { label: '業務員', value: doc.salesPersonName ?? '' },
        { label: '出貨倉', value: doc.warehouseName ?? '' },
        { label: '交貨方式', value: delivery[doc.deliveryType] ?? doc.deliveryType },
        { label: '幣別 / 稅率', value: `${doc.currencyCode ?? doc.currencyId} / ${Number(doc.taxRate)}%` },
      ]}
      columns={[
        { label: '序', width: '6%', align: 'center', render: (it) => it.lineNo },
        {
          label: '料號', width: '18%',
          render: (it) => (
            <span className="font-mono">
              {it.partNo}
              {it.actualPartNo && it.actualPartNo !== it.partNo ? <><br />↳實出 {it.actualPartNo}</> : null}
            </span>
          ),
        },
        { label: '品名', render: (it) => it.partName },
        { label: '廠牌', width: '10%', render: (it) => it.brandName ?? '' },
        { label: '數量', width: '8%', align: 'right', render: (it) => Number(it.qty) },
        { label: '單價', width: '11%', align: 'right', render: (it) => printMoney(it.unitPrice) },
        { label: '金額', width: '12%', align: 'right', render: (it) => printMoney(it.lineAmount) },
      ]}
      items={doc.items ?? []}
      getRowKey={(it) => it.id}
      totals={[
        { label: '未稅金額', value: printMoney(doc.subtotal) },
        { label: `稅額（${Number(doc.taxRate)}%）`, value: printMoney(doc.taxAmount) },
        { label: '總計', value: printMoney(doc.totalAmount), strong: true },
      ]}
      note={doc.remark}
      signatures={['製單', '主管', '客戶簽收']}
      onClose={onClose}
    />
  );
}
