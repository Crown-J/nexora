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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
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
import { DocPrintView, printMoney } from '@/features/shared/doc-shell/DocPrintView';

import {
  addQuoteItem,
  createQuote,
  getQuote,
  getQuotePriceIntel,
  patchQuoteItem,
  removeQuoteItem,
  updateQuote,
  voidQuote,
} from '@data/endpoints/nx04/quote/api/quote';

import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';

import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { PartPicker, type PickedPart } from './PartPicker';
import { QuoteRecordPickerDialog } from './QuoteRecordPickerDialog';
import type { Quote, QuoteItem } from '@data/types/nx04/quote';
// W5-ISSUE-CHAIN Step 5 2026-07-11：問題回報孤兒按鈕復活（單據外殼改版時掉的掛載點）
import { IssueReportModal } from '@/features/shared/issue-report-trigger';

// 給客戶的訊息（複製貼通訊軟體、執行長 2026-07-11）：整張報價每行一列 + 多行時附含稅合計。
// 格式對齊即時報價 / SalesFlowHub：「料號 品名〔數量 N〕報價 NT$ X」。
function buildCustomerMessage(q: Quote): string {
  const fmt = (n: number) =>
    n < 100 && n !== Math.floor(n) ? n.toFixed(2) : n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
  const items = q.items ?? [];
  const lines = items.map((it) => {
    const qtyPart = Number(it.qty) > 1 ? `　數量 ${Number(it.qty)}` : '';
    return `${it.baseNo ?? it.partNo} ${it.partName}${qtyPart}　報價 NT$ ${fmt(Number(it.unitPrice))}`;
  });
  if (items.length > 1) lines.push(`合計 NT$ ${fmt(Number(q.totalAmount))}（含稅）`);
  return lines.join('\n');
}

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
  initialMode?: 'browse' | 'editHeader' | 'editItems'; // 建單後→編輯明細；列表編輯→編輯表頭
}) {
  const [q, setQ] = useState<Quote | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  // W5-ISSUE-CHAIN Step 5：問題回報 modal
  const [irModalOpen, setIrModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [addMode, setAddMode] = useState(false); // 編輯明細時的內嵌新增（Excel 式逐列）
  const [editingItemId, setEditingItemId] = useState<string | null>(null); // 該明細列改內嵌編輯
  const [recordPickerOpen, setRecordPickerOpen] = useState(false);
  const [headerConfirmOpen, setHeaderConfirmOpen] = useState(false);
  const [selItem, setSelItem] = useState<string | null>(null); // 明細選中列（↑↓ 用）
  const [copied, setCopied] = useState(false); // 複製給客戶訊息的短暫回饋

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

  // 建單後（initialMode=editItems）q 載入即聚焦內嵌新增行料號（一次性、不再彈舊 picker）
  const autoPickRef = useRef(false);
  useEffect(() => {
    if (initialMode === 'editItems' && q && !autoPickRef.current) {
      autoPickRef.current = true;
      setAddMode(true);
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
      if (recordPickerOpen) return;
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
  }, [q, selItem, recordPickerOpen]);

  // 編輯明細 Alt 快捷（capture 搶在選單 accelerator 前 preventDefault）：A 新增 / F 從報價紀錄 / E 編輯 / D 移除 / S 存檔 / C 取消；ESC 退出新增
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
        f: () => setRecordPickerOpen(true),
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
    // removeSelectedItem 依當前閉包；以 disable 略過 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, addMode, editingItemId, selItem]);

  // 離開編輯明細 → 關閉新增/編輯模式
  useEffect(() => {
    if (mode !== 'editItems') {
      setAddMode(false);
      setEditingItemId(null);
    }
  }, [mode]);

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
              <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={statusEditable && !busy} onClick={() => setMode('editHeader')} />
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
              {/* W5-ISSUE-CHAIN Step 5：問題回報 → 統一異常登記簿 */}
              <ToolbarButton icon={AlertTriangle} label="問題回報" enabled={!busy} onClick={() => setIrModalOpen(true)} />
              <ToolbarSeparator />
              <ToolbarButton icon={Search} letter="F" label="查詢" enabled={!!onSearch} onClick={onSearch} />
              <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={() => void reload()} />
              <ToolbarButton icon={Printer} letter="P" label="列印" enabled onClick={() => setPrintOpen(true)} />
              <ToolbarButton icon={Download} letter="O" label="匯出" enabled onClick={() => setPrintOpen(true)} />
              <ToolbarButton
                icon={Copy}
                label={copied ? '已複製' : '複製訊息'}
                enabled={(q.items?.length ?? 0) > 0}
                accent={copied}
                onClick={() => {
                  void navigator.clipboard.writeText(buildCustomerMessage(q));
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              />
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
              <ToolbarButton icon={FileClock} letter="F" label="從報價紀錄" enabled={itemsEditable} onClick={() => setRecordPickerOpen(true)} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯項目" enabled={itemsEditable && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) { setAddMode(false); setEditingItemId(selItem); } }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditable && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
        </div>
      </ToolbarPortal>

      {printOpen && q ? <QuotePrintSheet doc={q} onClose={() => setPrintOpen(false)} /> : null}

      {irModalOpen && q ? (
        <IssueReportModal
          sourceDocType="QT"
          sourceDocId={q.id}
          sourceDocNo={q.docNo}
          warehouseId={q.warehouseId}
          partOptions={(q.items ?? []).map((it) => ({ partId: it.partId, partNo: it.partNo, partName: it.partName }))}
          onClose={() => setIrModalOpen(false)}
        />
      ) : null}

      {error ? (
        <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {/* 左右兩塊：左＝表頭 Form、右＝明細 Table ＋ 金額結算（高度滿版）*/}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form（標籤：輸入框、每欄獨立一列、滿版）；編輯明細時暗面讓位 */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[420px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
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
              <select
                autoFocus
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setHeaderConfirmOpen(true);
                  }
                }}
                className={inputCls}
              >
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

        {/* 右：明細（含 tfoot 金額結算對齊欄位）；編輯表頭時暗面讓位 */}
        <section
          className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity ${
            mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <ItemsSection
            q={q}
            items={q.items ?? []}
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

      {recordPickerOpen ? (
        <QuoteRecordPickerDialog
          customerId={q.customerId}
          customerName={q.customerName}
          onClose={() => setRecordPickerOpen(false)}
          onConfirm={async (recs) => {
            setRecordPickerOpen(false);
            try {
              for (const r of recs) {
                // 拉入報價紀錄的料號+價（報價單每行都計入總價）
                await addQuoteItem(q.id, {
                  partId: r.partId,
                  qty: Number(r.qty) || 1,
                  unitPriceSnapshot: Number(r.unitPrice) || 0,
                  isSelected: true,
                });
              }
              await reloadAll();
            } catch (e) {
              alert(e instanceof Error ? e.message : '帶入失敗');
            }
          }}
        />
      ) : null}

      {/* 編輯表頭 Enter → 確認 → 存檔並進入明細 */}
      {headerConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setHeaderConfirmOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-sm font-semibold">確認並進入明細編輯</h2>
            <p className="text-sm text-muted-foreground">
              出貨倉庫：
              {warehouses.find((w) => w.id === warehouseId)?.code ?? ''}
              {warehouses.find((w) => w.id === warehouseId)?.name ?? ''}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setHeaderConfirmOpen(false)} className="rounded border px-4 py-1.5 text-sm">
                返回
              </button>
              <button
                type="button"
                autoFocus
                disabled={busy}
                onClick={() => {
                  setHeaderConfirmOpen(false);
                  void saveHeader();
                }}
                className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {busy ? '存檔中…' : '確認 (Enter)'}
              </button>
            </div>
          </div>
        </div>
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
  addMode,
  onExitAdd,
  editingItemId,
  onExitEdit,
}: {
  q: Quote;
  items: QuoteItem[];
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
        editingItemId={editable ? editingItemId : null}
        renderEditRow={(it) => (
          <InlineItemRow
            quoteId={q.id}
            customerId={q.customerId}
            taxRate={Number(q.taxRate) || 0}
            nextLineNo={it.lineNo}
            editItem={it}
            onSaved={onChanged}
            onExit={onExitEdit ?? (() => {})}
          />
        )}
        addRow={
          editable && addMode ? (
            <InlineItemRow
              quoteId={q.id}
              customerId={q.customerId}
              taxRate={Number(q.taxRate) || 0}
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

/** 內嵌 Excel 式新增列（<tr>）：料號→數量→單價，Enter 逐格前進、末格存檔續下一列、ESC 退出。新增即計入總價。 */
/** 內嵌 Excel 式明細列（<tr>）：新增或編輯共用。料號→數量→單價，Enter 逐格前進、末格存檔、ESC 退出。
 *  新增：末格存檔後續下一列；編輯：存檔後退出。欄位聚焦即全選（免先 Backspace）。 */
function InlineItemRow({
  quoteId,
  customerId,
  taxRate,
  nextLineNo,
  editItem,
  onSaved,
  onExit,
}: {
  quoteId: string;
  customerId: string;
  taxRate: number;
  nextLineNo: number;
  editItem?: QuoteItem; // 提供＝編輯模式（預填、patch）
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const isEdit = !!editItem;
  const partFromItem = (it: QuoteItem): PickedPart => ({
    id: it.partId,
    code: it.baseNo ?? it.partNo,
    name: it.partName,
    secCode: it.brandNo ?? null,
    brandName: it.brandName ?? null,
    availableTotal: '0',
    onHandTotal: '0',
  });
  const [part, setPart] = useState<PickedPart | null>(editItem ? partFromItem(editItem) : null);
  const [qty, setQty] = useState(editItem ? String(editItem.qty) : '1');
  const [price, setPrice] = useState(editItem ? String(editItem.unitPrice) : '');
  const [busy, setBusy] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const partRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  // 進入即聚焦料號（新增與編輯都從料號開始）
  useEffect(() => {
    partRef.current?.focus();
  }, []);

  const pickPart = async (p: PickedPart) => {
    setPart(p);
    setTimeout(() => qtyRef.current?.focus(), 0);
    try {
      const intel = await getQuotePriceIntel(customerId, p.id);
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
      partRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (isEdit && editItem) {
        await patchQuoteItem(quoteId, editItem.id, {
          partId: part.id,
          qty: Number(qty),
          unitPriceSnapshot: Number(price),
        });
        await onSaved();
        onExit(); // 編輯單筆、存檔即退出
      } else {
        await addQuoteItem(quoteId, {
          partId: part.id,
          qty: Number(qty),
          unitPriceSnapshot: Number(price),
          isSelected: true, // 報價單每一行都算進總價
        });
        await onSaved();
        reset(); // 續打下一列
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : isEdit ? '修改失敗' : '新增失敗');
    } finally {
      setBusy(false);
    }
  };

  const lineSub = (Number(qty) || 0) * (Number(price) || 0);
  const lineTax = Math.round((lineSub * taxRate) / 100);
  const fmt = (n: number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
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
      <td
        className="px-2 py-1"
        colSpan={4}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            qtyRef.current?.focus();
          }
        }}
      >
        <PartPicker
          key={pickerKey}
          inputRef={partRef}
          initialText={editItem ? `${editItem.baseNo ?? editItem.partNo}　${editItem.partName}` : undefined}
          onPick={(p) => void pickPart(p)}
        />
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              priceRef.current?.focus();
            }
          }}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            }
          }}
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
  addRow,
  editingItemId,
  renderEditRow,
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
  addRow?: React.ReactNode; // 內嵌新增列（編輯明細 + 新增模式時）
  editingItemId?: string | null; // 該列改用內嵌編輯列
  renderEditRow?: (it: QuoteItem) => React.ReactNode;
}) {
  const rate = taxRate;
  const colCount = editable ? 11 : 10; // 序號..總價 10 欄 + 編輯時刪除欄
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
  const pad = Math.max(0, fitRows - items.length - (addRow ? 1 : 0));
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
              if (editingItemId && it.id === editingItemId && renderEditRow) {
                return <Fragment key={it.id}>{renderEditRow(it)}</Fragment>;
              }
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
            {addRow}
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

/** NX-DOC-PRINT：報價單列印設定（DocPrintView 皮） */
function QuotePrintSheet({ doc, onClose }: { doc: Quote; onClose: () => void }) {
  return (
    <DocPrintView
      title="報　價　單"
      docNo={doc.docNo}
      fields={[
        { label: '單號', value: doc.docNo },
        { label: '報價日期', value: doc.quoteDate.slice(0, 10) },
        { label: '客戶編號', value: doc.customerCode ?? '' },
        { label: '客戶名稱', value: doc.customerName ?? '' },
        { label: '業務員', value: doc.salesPersonName ?? '' },
        { label: '有效日期', value: doc.validUntil ? doc.validUntil.slice(0, 10) : '' },
        { label: '參考文號', value: doc.customerRefNo ?? '' },
        { label: '幣別 / 稅率', value: `${doc.currencyCode ?? doc.currencyId} / ${Number(doc.taxRate)}%` },
      ]}
      columns={[
        { label: '序', width: '6%', align: 'center', render: (it) => it.lineNo },
        { label: '料號', width: '18%', render: (it) => <span className="font-mono">{it.partNo}</span> },
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
      signatures={['製單', '主管', '客戶確認']}
      onClose={onClose}
    />
  );
}
