// apps/nx-ui/src/features/nx04/quote/ui/QuoteDetailView.tsx
// NX04-QT-SHELL：報價單詳情面板（QuoteWorkbench「詳細資料」分頁 L4 內容）
//   左右兩塊：左＝表頭 Form（標籤:輸入框一欄一列）／右＝明細 Table（含 tfoot 金額結算）
//   L3 工具列三狀態：
//     · 瀏覽：⏮◀ N/M ▶⏭ ｜ A新增 E編輯 D刪除(作廢) ｜ F查詢 R重整 P列印 O匯出
//     · 編輯表頭：S存檔 C取消（左可編、右鎖）
//     · 編輯明細：S存檔 A新增項目 E編輯項目 D移除項目 C取消（右可編、左鎖）
//   ⚠️ 新增 inline（最後欄 Enter 存檔產號）+ 取消視作廢 + 編輯項目 → 待 Step4 picker 一起做

'use client';

import {
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
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';

import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';

import {
  createQuote,
  getQuote,
  removeQuoteItem,
  updateQuote,
  voidQuote,
} from '@data/endpoints/nx04/quote/api/quote';

import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';

import { BatchQuoteDialog } from './BatchQuoteDialog';
import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import type { Quote, QuoteItem } from '@data/types/nx04/quote';

export function QuoteDetailPanel({
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
  initialMode?: 'browse' | 'editItems'; // 建單後直接進「編輯明細」
}) {
  const [q, setQ] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [addOpen, setAddOpen] = useState(false);
  const [selItem, setSelItem] = useState<string | null>(null); // 明細選中列（↑↓ 用）

  // 表頭可編欄位（編輯模式）
  const [quoteDate, setQuoteDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [customerRefNo, setCustomerRefNo] = useState('');
  const [remark, setRemark] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);

  // 倉庫清單（出貨倉庫下拉、編輯表頭用）
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

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQ(await getQuote(id));
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

  // 換筆/重載時離開編輯模式、表單欄位同步自 q
  useEffect(() => {
    if (!q) return;
    setQuoteDate(q.quoteDate.slice(0, 10));
    setValidUntil(q.validUntil?.slice(0, 10) ?? '');
    setCustomerRefNo(q.customerRefNo ?? '');
    setRemark(q.remark ?? '');
    setWarehouseId(q.warehouseId ?? '');
  }, [q?.id, q?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // 換筆時自動回瀏覽（僅 id 真的變動才重置；初次掛載保留 initialMode，否則建單後的「編輯明細」會被洗掉）
  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

  // 建單後（initialMode=editItems）q 載入即自動跳出批次報價 picker（一次性）
  const autoPickRef = useRef(false);
  useEffect(() => {
    if (initialMode === 'editItems' && q && !autoPickRef.current) {
      autoPickRef.current = true;
      setAddOpen(true);
    }
  }, [q, initialMode]);

  // 明細：預設選第一列；換單/明細變動時若選中列失效則回第一列
  useEffect(() => {
    const its = q?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [q, selItem]);

  // 明細：↑↓ 選列（焦點固定在明細表格、輸入框/彈窗時讓位）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (addOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = q?.items ?? [];
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
  }, [q, selItem, addOpen]);

  // 選中明細列捲入可視
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

  if (loading && !q) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !q) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!q) return null;

  const statusEditable = q.status === 'DRAFT' || q.status === 'SENT';
  const headerEditing = mode === 'editHeader' && statusEditable && !q.voidedAt;
  const itemsEditable = mode === 'editItems' && statusEditable && !q.voidedAt;
  const expired = q.validUntil ? new Date(q.validUntil) < new Date(new Date().toDateString()) : false;

  const canVoid = q.status === 'DRAFT' || q.status === 'SENT';

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateQuote(id, {
        quoteDate,
        validUntil: validUntil || undefined,
        customerRefNo: customerRefNo.trim() || undefined,
        warehouseId: warehouseId || undefined,
        remark,
      });
      setMode('editItems'); // 表頭存檔後進入編輯明細（對齊 表頭→明細 流程）
      await reloadAll();
    } catch (e) {
      setError(`存檔: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (q) {
      setQuoteDate(q.quoteDate.slice(0, 10));
      setValidUntil(q.validUntil?.slice(0, 10) ?? '');
      setCustomerRefNo(q.customerRefNo ?? '');
      setRemark(q.remark ?? '');
      setWarehouseId(q.warehouseId ?? '');
    }
    setMode('browse');
  }

  // 移除選中的明細項目（編輯明細 D）
  async function removeSelectedItem() {
    if (!selItem) {
      alert('請先選一筆明細');
      return;
    }
    if (!window.confirm('移除選中的明細項目？')) return;
    try {
      await removeQuoteItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60';
  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-foreground';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* L3 工具列 */}
      <ToolbarPortal>
        <div
          data-nx-frame
          className="flex items-center gap-1 border-b border-border/40 px-3 py-2"
          style={{
            backgroundImage:
              'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
          }}
        >
          {mode === 'browse' ? (
            <>
              <NavButton icon={ChevronsLeft} disabled={!onJumpFirst || (itemIndex ?? 1) <= 1} onClick={onJumpFirst} title="第一筆" />
              <NavButton icon={ChevronLeft} disabled={!onPrevItem || (itemIndex ?? 1) <= 1} onClick={onPrevItem} title="上一筆" />
              <span className="min-w-[3rem] px-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
                {itemIndex ?? '-'} / {itemTotal ?? '-'}
              </span>
              <NavButton
                icon={ChevronRight}
                disabled={!onNextItem || (itemTotal !== undefined && (itemIndex ?? 0) >= itemTotal)}
                onClick={onNextItem}
                title="下一筆"
              />
              <NavButton
                icon={ChevronsRight}
                disabled={!onJumpLast || (itemTotal !== undefined && (itemIndex ?? 0) >= itemTotal)}
                onClick={onJumpLast}
                title="最後一筆"
              />
              <ToolbarSeparator />
              <ToolbarButton icon={Plus} letter="A" label="新增" enabled={!!onCreate} onClick={onCreate} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯表頭" enabled={statusEditable && !busy} onClick={() => setMode('editHeader')} />
              <ToolbarButton icon={Pencil} letter="I" label="編輯明細" enabled={statusEditable && !busy} onClick={() => setMode('editItems')} />
              <ToolbarButton
                icon={Trash2}
                letter="D"
                label="刪除"
                enabled={canVoid && !busy}
                variant="danger"
                onClick={() => {
                  const reason = window.prompt('作廢原因（必填）');
                  if (!reason?.trim()) return;
                  void handle(() => voidQuote(id, reason.trim()), '作廢');
                }}
              />
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
              <ToolbarButton icon={Plus} letter="A" label="新增項目" enabled={itemsEditable} onClick={() => setAddOpen(true)} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯項目" enabled={itemsEditable && !!selItem} onClick={() => alert('編輯項目（開發中）')} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditable && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
        </div>
      </ToolbarPortal>

      {error ? (
        <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {/* 左右兩塊：左＝表頭 Form、右＝明細 Table ＋ 金額結算（高度滿版）*/}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form（標籤：輸入框、每欄獨立一列、滿版）*/}
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號">
            <input readOnly value={q.docNo} className={`${roCls} font-mono`} />
          </FieldRow>
          <FieldRow label="單據狀態">
            <input readOnly value={q.voidedAt ? '作廢' : expired ? '失效' : '有效'} className={roCls} />
          </FieldRow>
          <FieldRow label="報價日期">
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} disabled={!headerEditing} className={inputCls} />
          </FieldRow>
          <FieldRow label="客戶編號">
            <input readOnly value={q.customerCode ?? q.customerId} className={`${roCls} font-mono`} />
          </FieldRow>
          <FieldRow label="客戶名稱">
            <input readOnly value={q.customerName ?? ''} className={roCls} />
          </FieldRow>
          <FieldRow label="幣別">
            <input readOnly value={q.currencyCode ?? q.currencyId} className={roCls} />
          </FieldRow>
          <FieldRow label="出貨倉庫">
            {headerEditing ? (
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code}　{w.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                readOnly
                value={q.warehouseName ? `${q.warehouseCode ?? ''}　${q.warehouseName}` : (q.warehouseCode ?? q.warehouseId)}
                className={roCls}
              />
            )}
          </FieldRow>
          <FieldRow label="建單人員">
            <input readOnly value={q.createdByName ?? ''} className={roCls} />
          </FieldRow>
          <FieldRow label="建單日期">
            <input readOnly value={q.createdAt.slice(0, 10)} className={roCls} />
          </FieldRow>
          <FieldRow label="有效日期" labelDanger={expired}>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={!headerEditing} className={inputCls} />
          </FieldRow>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              disabled={!headerEditing}
              rows={3}
              className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60"
            />
          </div>
        </section>

        {/* 右：明細（含 tfoot 金額結算對齊欄位）*/}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ItemsSection
            q={q}
            items={q.items ?? []}
            editable={itemsEditable}
            onChanged={reloadAll}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
          />
        </section>
      </div>

      {addOpen ? (
        <BatchQuoteDialog
          quoteId={q.id}
          customerId={q.customerId}
          warehouseId={q.warehouseId}
          warehouseName={q.warehouseName ?? ''}
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            await reloadAll();
          }}
        />
      ) : null}
    </div>
  );
}

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

/**
 * 新增報價單面板（內嵌、無彈窗）：鎖右編左
 * 單號/狀態/建單 自動；停客戶編號（picker + F4 注音）→ Enter 跳幣別 → Enter 存檔確認 → 確認建單。
 * 出貨倉庫：選客戶時預帶該客戶預設取貨倉，可改；未指定則後端自動帶（客戶預設→使用者隸屬倉→主倉）。
 */
export function QuoteCreatePanel({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('TWD');
  const [remark, setRemark] = useState('');
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const warehouseRef = useRef<HTMLSelectElement>(null);
  const currencyRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmOpen) confirmRef.current?.focus();
  }, [confirmOpen]);

  // 倉庫清單（出貨倉庫下拉）
  useEffect(() => {
    void (async () => {
      try {
        const res = await listWarehouses({ page: 1, pageSize: 200, isActive: true });
        setWarehouses(res.items.map((w) => ({ id: w.id, code: w.code, name: w.name })));
      } catch {
        /* 撈不到不擋建單 */
      }
    })();
  }, []);

  // 選客戶 → 出貨倉庫預帶該客戶預設取貨倉
  const handlePickCustomer = (c: PickedCustomer) => {
    setCustomer(c);
    if (c.defaultWarehouseId) setWarehouseId(c.defaultWarehouseId);
  };

  async function doSave() {
    if (!customer) {
      setErr('請先選客戶');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const q = await createQuote({
        customerId: customer.id,
        quoteDate,
        currencyId: currency.trim() || undefined,
        warehouseId: warehouseId || undefined,
        taxRate: 5,
        remark: remark.trim() || undefined,
      });
      onCreated(q.id);
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
          <span className="px-1 text-[11px] text-muted-foreground">新增報價單</span>
        </div>
      </ToolbarPortal>

      {err ? (
        <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號">
            <input readOnly value="存檔後產生" className={roCls} />
          </FieldRow>
          <FieldRow label="單據狀態">
            <input readOnly value="新建" className={roCls} />
          </FieldRow>
          <FieldRow label="報價日期">
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={inputCls} />
          </FieldRow>
          <FieldRow label="客戶編號">
            <CustomerPicker autoFocus onPick={handlePickCustomer} onCommit={() => warehouseRef.current?.focus()} />
          </FieldRow>
          <FieldRow label="客戶名稱">
            <input readOnly value={customer?.name ?? ''} className={roCls} />
          </FieldRow>
          <FieldRow label="出貨倉庫">
            <select
              ref={warehouseRef}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  currencyRef.current?.focus();
                }
              }}
              className={inputCls}
            >
              <option value="">（未指定，存檔自動帶）</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code}　{w.name}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="幣別">
            <input
              ref={currencyRef}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customer) setConfirmOpen(true);
                }
              }}
              className={inputCls}
            />
          </FieldRow>
          <FieldRow label="備註">
            <input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} />
          </FieldRow>
        </section>

        {/* 右：明細表（與詳情頁同版型、存檔前鎖定顯示空表）*/}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <QuoteItemsTable items={[]} taxRate={5} subtotal={0} taxAmount={0} totalAmount={0} editable={false} selectedItemId={null} />
        </section>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-sm font-semibold">確認建立報價單</h2>
            <p className="text-sm text-muted-foreground">
              客戶：{customer?.code}　{customer?.name}
              <br />
              存檔後將產生單號，並可開始編輯明細。
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded border px-4 py-1.5 text-sm">
                取消
              </button>
              <button
                ref={confirmRef}
                type="button"
                disabled={busy}
                onClick={() => void doSave()}
                className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {busy ? '建立中…' : '確認 (Enter)'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 表頭欄列：左標籤（含冒號）＋ 右輸入框，滿版一列一欄 */
function FieldRow({
  label,
  children,
  labelDanger,
}: {
  label: string;
  children: React.ReactNode;
  labelDanger?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className={`w-20 shrink-0 text-right text-xs ${labelDanger ? 'text-rose-600' : 'text-muted-foreground'}`}>
        {label}：
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function ItemsSection({
  q,
  items,
  editable,
  onChanged,
  selectedItemId,
  onSelectItem,
}: {
  q: Quote;
  items: QuoteItem[];
  editable: boolean;
  onChanged: () => void | Promise<void>;
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
}) {
  const handleRemove = async (itemId: string) => {
    try {
      await removeQuoteItem(q.id, itemId);
      await onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    }
  };
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <QuoteItemsTable
        items={items}
        taxRate={Number(q.taxRate) || 0}
        subtotal={q.subtotal}
        taxAmount={q.taxAmount}
        totalAmount={q.totalAmount}
        editable={editable}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        onRemoveItem={handleRemove}
      />
    </section>
  );
}

/** 明細表（純呈現，詳情頁與新增面板共用；新增時 items=[] + locked 顯示空表）*/
function QuoteItemsTable({
  items,
  taxRate,
  subtotal,
  taxAmount,
  totalAmount,
  editable,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
}: {
  items: QuoteItem[];
  taxRate: number;
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  editable: boolean;
  selectedItemId: string | null;
  onSelectItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
}) {
  const rate = taxRate;
  const colCount = editable ? 11 : 10;
  const fmt = (n: string | number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  // 依容器高度動態補足空白列（填滿到底）；不足則捲動
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitRows, setFitRows] = useState(12);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ROW = 37; // 每列約略高度（py-2 + 字 + 邊框）
    const calc = () => setFitRows(Math.max(0, Math.floor((el.clientHeight - 38 - 42) / ROW)));
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pad = Math.max(0, fitRows - items.length);
  return (
    <div ref={scrollRef} className="flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-border/60 [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border/60">
          <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">序號</th>
              <th className="px-3 py-2 text-left">基準料號</th>
              <th className="px-3 py-2 text-left">廠牌料號</th>
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
              const below = it.minPrice && Number(it.unitPrice) < Number(it.minPrice);
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
                    sel
                      ? 'bg-[var(--primary)]/15 shadow-[inset_3px_0_0_var(--primary)]'
                      : `${i % 2 === 1 ? 'bg-foreground/[0.04]' : 'bg-card'} hover:bg-accent/15`
                  }`}
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground">{it.lineNo}</td>
                  <td className="px-3 py-2 font-mono text-xs">{it.baseNo ?? it.partNo}</td>
                  <td className="px-3 py-2 font-mono text-xs">{it.brandNo ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">{it.brandName ?? '—'}</td>
                  <td className="px-3 py-2">{it.partName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${below ? 'font-semibold text-rose-600' : ''}`}
                    title={below ? `低於最低售價：${it.belowMinReason ?? '未填理由'}` : undefined}
                  >
                    {fmt(it.unitPrice)}
                  </td>
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
            {/* 動態空白列：補足填滿容器（圖二樣式、延續斑馬紋），不足則由容器捲動 */}
            {Array.from({ length: pad }).map((_, i) => (
              <tr key={`ph_${i}`} aria-hidden className={(items.length + i) % 2 === 1 ? 'bg-foreground/[0.04]' : 'bg-card'}>
                {Array.from({ length: colCount }).map((__, j) => (
                  <td key={j} className="px-3 py-2">
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 border-t border-border/60 bg-muted text-sm">
            <tr>
              <td className="px-3 py-2 text-right text-xs text-muted-foreground" colSpan={7}>
                合計
              </td>
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
