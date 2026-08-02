// apps/nx-ui/src/features/nx04/sales-return/ui/SrDetailView.new.tsx
// NX04-QT-SHELL：銷退單詳情面板（比照 SoDetailView.new 模板：左右兩塊 + 三狀態工作列）
//   SR 專屬：狀態動作（送驗收/過帳+returnAction/駁回/取消）、明細「只能」從來源銷貨單帶入（A=開 SO 行對話框）、
//   明細編輯=數量/退貨原因/好壞品處置（DRAFT+INSPECTING）、過帳前全明細須處置旗標（X 換新除外）。
//   偉盟歷史匯入（soId=null）唯讀：後端已擋新增/編輯/過帳、UI 依狀態自然鎖。
'use client';

import {
  AlertTriangle,
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
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { DocPrintView, printMoney } from '@/features/shared/doc-shell/DocPrintView';

import {
  addSrItem,
  createSr,
  getSr,
  patchSrItem,
  removeSrItem,
  updateSr,
  voidSr,
} from '@data/endpoints/nx04/sales-return/api/sales-return';
import { getSo, listSo } from '@data/endpoints/nx04/so/api/so';
import type { So, SoItem } from '@data/types/nx04/so';
import type { Sr, SrItem } from '@data/types/nx04/sales-return';
import { SR_STATUS_LABEL } from '@data/types/nx04/sales-return';
// W5-ISSUE-CHAIN Step 5 2026-07-11：問題回報孤兒按鈕復活（單據外殼改版時掉的掛載點）
import { IssueReportModal } from '@/features/shared/issue-report-trigger';

const fmt = (n: string | number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

/** 退款/取件方式合併標籤：系統建立=R/D/X（退款方式）、偉盟歷史=S/C/P（取件方式） */
export const SR_METHOD_LABEL: Record<string, string> = {
  R: '退錢給客戶',
  D: '折讓下次採購',
  X: '換新品',
  S: '客戶自行送回',
  C: '外務順路取回',
  P: '客戶自行寄回',
};
const INITIATION_LABEL: Record<string, string> = { A: '業務發起（計畫性）', B: '送貨員當場帶回（臨時）' };
const REASON_LABEL: Record<string, string> = { C: '客戶不需要', D: '商品有瑕疵', W: '送錯料號', Q: '送錯數量', O: '其他' };
const DISPOSITION_SHORT: Record<string, string> = { G: '好品', B: '壞品' };

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

export function SrDetailPanel({
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
  const [sr, setSr] = useState<Sr | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  // W5-ISSUE-CHAIN Step 5：問題回報 modal
  const [irModalOpen, setIrModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [addOpen, setAddOpen] = useState(false); // 從來源銷貨單帶入（SR 明細唯一來源）
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selItem, setSelItem] = useState<string | null>(null);

  // 表頭可編欄位（updateSr 支援：srDate / remark / initiationType）
  const [srDate, setSrDate] = useState('');
  const [initiationType, setInitiationType] = useState('');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSr(await getSr(id));
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
    if (!sr) return;
    setSrDate(sr.srDate.slice(0, 10));
    setInitiationType(sr.initiationType ?? '');
    setRemark(sr.remark ?? '');
  }, [sr?.id, sr?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

  // 建單後（initialMode=editItems）→ 自動開「從銷貨單帶入」
  const autoAddRef = useRef(false);
  useEffect(() => {
    if (initialMode === 'editItems' && sr && !autoAddRef.current) {
      autoAddRef.current = true;
      setAddOpen(true);
    }
  }, [sr, initialMode]);

  // 明細預設選第一列
  useEffect(() => {
    const its = sr?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [sr, selItem]);

  // 明細 ↑↓ 選列
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (addOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = sr?.items ?? [];
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
  }, [sr, selItem, addOpen]);

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

  if (loading && !sr) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !sr) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!sr) return null;

  const statusEditable = sr.status === 'DRAFT' || sr.status === 'INSPECTING';
  const headerEditing = mode === 'editHeader' && statusEditable;
  const itemsEditable = mode === 'editItems' && statusEditable;

  // 狀態動作可用性（沿舊詳情規則）
  const canSubmit = sr.status === 'DRAFT' && (sr.items?.length ?? 0) > 0;
  const postReady =
    sr.returnMethod === 'X' || (sr.items ?? []).every((it) => it.dispositionFlag === 'G' || it.dispositionFlag === 'B');
  const canPost = sr.status === 'INSPECTING' && postReady;
  const canReject = sr.status === 'INSPECTING';
  const canCancel = statusEditable;

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateSr(id, {
        srDate,
        remark,
        ...(initiationType ? { initiationType: initiationType as 'A' | 'B' } : {}),
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
    if (sr) {
      setSrDate(sr.srDate.slice(0, 10));
      setInitiationType(sr.initiationType ?? '');
      setRemark(sr.remark ?? '');
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
      await removeSrItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
  }

  function doSubmit() {
    if (!window.confirm('送驗收？（交由倉管收貨檢驗）')) return;
    void handle(() => updateSr(id, { status: 'INSPECTING' }), '送驗收');
  }
  function doPost() {
    const action =
      sr!.returnMethod === 'X'
        ? 'X'
        : (window.prompt('過帳方式（R 退錢 / D 折讓 / X 換新）', sr!.returnMethod) ?? '').trim().toUpperCase();
    if (!['R', 'D', 'X'].includes(action)) {
      if (action) alert('過帳方式必為 R / D / X');
      return;
    }
    void handle(() => updateSr(id, { status: 'POSTED', returnAction: action as 'R' | 'D' | 'X' }), '過帳');
  }
  function doReject() {
    const reason = window.prompt('駁回原因（必填）');
    if (!reason?.trim()) return;
    void handle(() => updateSr(id, { status: 'REJECTED', rejectReason: reason.trim() }), '駁回');
  }
  function doCancel() {
    const reason = window.prompt('取消（作廢）原因（必填）');
    if (!reason?.trim()) return;
    void handle(() => voidSr(id, reason.trim()), '取消');
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
              <ToolbarButton icon={Trash2} letter="D" label="取消" enabled={canCancel && !busy} variant="danger" onClick={doCancel} />
              <ToolbarSeparator />
              {/* SR 狀態流：送驗收 / 過帳 / 駁回（依狀態亮） */}
              <ToolbarButton icon={Send} letter="G" label="送驗收" enabled={canSubmit && !busy} onClick={doSubmit} />
              <ToolbarButton
                icon={CheckCircle2}
                letter="T"
                label="過帳"
                enabled={canPost && !busy}
                accent
                onClick={doPost}
              />
              <ToolbarButton icon={XCircle} label="駁回" enabled={canReject && !busy} variant="danger" onClick={doReject} />
              <ToolbarSeparator />
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
              <ToolbarButton icon={FileClock} letter="A" label="從銷貨單帶入" enabled={itemsEditable && !!sr.soId} pressed={addOpen} onClick={() => setAddOpen(true)} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯項目" enabled={itemsEditable && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) { setAddOpen(false); setEditingItemId(selItem); } }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditable && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
          {mode === 'browse' && sr.status === 'INSPECTING' && !postReady ? (
            <span className="px-1 text-[11px] text-amber-600">⚠ 過帳前全明細須填好/壞品處置</span>
          ) : null}
        </div>
      </ToolbarPortal>

      {printOpen && sr ? <SrPrintSheet doc={sr} onClose={() => setPrintOpen(false)} /> : null}

      {irModalOpen && sr ? (
        <IssueReportModal
          sourceDocType="SR"
          sourceDocId={sr.id}
          sourceDocNo={sr.docNo}
          warehouseId={sr.warehouseId}
          partOptions={(sr.items ?? []).map((it) => ({ partId: it.partId, partNo: it.partNo, partName: it.partName }))}
          onClose={() => setIrModalOpen(false)}
        />
      ) : null}

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}
      {sr.status === 'REJECTED' && sr.rejectReason ? (
        <div className="mx-4 mt-3 rounded border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">駁回原因：{sr.rejectReason}</div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[420px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <FieldRow label="單號"><input readOnly value={sr.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={SR_STATUS_LABEL[sr.status] ?? sr.status} className={roCls} /></FieldRow>
          <FieldRow label="銷退日期"><input type="date" value={srDate} onChange={(e) => setSrDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="客戶編號"><input readOnly value={sr.customerCode ?? sr.customerId} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="客戶名稱"><input readOnly value={sr.customerName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="來源銷貨單"><input readOnly value={sr.soDocNo ?? (sr.soId ? sr.soId : '—（歷史匯入無原單）')} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="退回倉庫"><input readOnly value={sr.warehouseName ? `${sr.warehouseCode ?? ''}　${sr.warehouseName}` : (sr.warehouseCode ?? sr.warehouseId)} className={roCls} /></FieldRow>
          <FieldRow label="退款方式"><input readOnly value={SR_METHOD_LABEL[sr.returnMethod] ?? sr.returnMethod} className={roCls} /></FieldRow>
          <FieldRow label="退回方式">
            {headerEditing ? (
              <select value={initiationType} onChange={(e) => setInitiationType(e.target.value)} className={inputCls}>
                <option value="">（未指定）</option>
                <option value="A">A 業務發起（計畫性）</option>
                <option value="B">B 送貨員當場帶回（臨時）</option>
              </select>
            ) : (
              <input readOnly value={sr.initiationType ? INITIATION_LABEL[sr.initiationType] ?? sr.initiationType : '—'} className={roCls} />
            )}
          </FieldRow>
          <FieldRow label="建單人員"><input readOnly value={sr.createdByName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={sr.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!headerEditing} rows={3} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>
        </section>

        {/* 右：明細 */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity ${mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''}`}>
          <SrItemsTable
            items={sr.items ?? []}
            taxRate={Number(sr.taxRate) || 0}
            subtotal={sr.subtotal}
            taxAmount={sr.taxAmount}
            totalAmount={sr.totalAmount}
            editable={itemsEditable}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
            onRemoveItem={async (itemId) => {
              try {
                await removeSrItem(id, itemId);
                await reloadAll();
              } catch (e) {
                alert(e instanceof Error ? e.message : '刪除失敗');
              }
            }}
            editingItemId={itemsEditable ? editingItemId : null}
            renderEditRow={(it) => (
              <SrInlineEditRow
                srId={sr.id}
                taxRate={Number(sr.taxRate) || 0}
                editItem={it}
                onSaved={reloadAll}
                onExit={() => setEditingItemId(null)}
              />
            )}
          />
        </section>
      </div>

      {addOpen && sr.soId ? (
        <SoLineAddDialog
          soId={sr.soId}
          srDocNo={sr.docNo}
          onClose={() => setAddOpen(false)}
          onConfirm={async (rows) => {
            setAddOpen(false);
            try {
              for (const r of rows) {
                await addSrItem(sr.id, { soItemId: r.soItemId, qty: r.qty, returnReason: r.reason });
              }
              await reloadAll();
            } catch (e) {
              alert(e instanceof Error ? e.message : '帶入失敗（可能超過可退量）');
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

/** 新增銷退單面板（內嵌）：先挑來源銷貨單（限已出貨/已開立）→ 銷退日期/退款方式 → 建單 → 進帶入明細 */
export function SrCreatePanel({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [so, setSo] = useState<So | null>(null);
  const [srDate, setSrDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnMethod, setReturnMethod] = useState('R');
  const [initiationType, setInitiationType] = useState('');
  const [remark, setRemark] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmOpen) confirmRef.current?.focus();
  }, [confirmOpen]);

  async function doSave() {
    if (!so) {
      setErr('請先選來源銷貨單');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const sr = await createSr({
        soId: so.id,
        srDate,
        returnMethod,
        ...(initiationType ? { initiationType: initiationType as 'A' | 'B' } : {}),
        taxRate: Number(so.taxRate) || 5,
        remark: remark.trim() || undefined,
      });
      onCreated(sr.id);
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
          <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!!so && !busy} accent onClick={() => setConfirmOpen(true)} />
          <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={onCancel} />
          <div className="flex-1" />
          <span className="px-1 text-[11px] text-muted-foreground">新增銷退單</span>
        </div>
      </ToolbarPortal>

      {err ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號"><input readOnly value="存檔後產生" className={roCls} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value="新建" className={roCls} /></FieldRow>
          <FieldRow label="來源銷貨單"><SoPickerInput onPick={setSo} /></FieldRow>
          <FieldRow label="客戶"><input readOnly value={so ? `${so.customerCode ?? ''}　${so.customerName ?? so.customerId}` : ''} className={roCls} /></FieldRow>
          <FieldRow label="銷退日期"><input type="date" value={srDate} onChange={(e) => setSrDate(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="退款方式">
            <select value={returnMethod} onChange={(e) => setReturnMethod(e.target.value)} className={inputCls}>
              <option value="R">R 退錢給客戶</option>
              <option value="D">D 折讓下次採購</option>
              <option value="X">X 換新品</option>
            </select>
          </FieldRow>
          <FieldRow label="退回方式">
            <select value={initiationType} onChange={(e) => setInitiationType(e.target.value)} className={inputCls}>
              <option value="">（未指定）</option>
              <option value="A">A 業務發起（計畫性）</option>
              <option value="B">B 送貨員當場帶回（臨時）</option>
            </select>
          </FieldRow>
          <FieldRow label="備註"><input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} /></FieldRow>
          <p className="pt-1 text-[11px] text-muted-foreground">來源銷貨單限「已出貨 / 已開立」；建單後從該單帶入退貨明細。</p>
        </section>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SrItemsTable items={[]} taxRate={5} subtotal={0} taxAmount={0} totalAmount={0} editable={false} selectedItemId={null} />
        </section>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-sm font-semibold">確認建立銷退單</h2>
            <p className="text-sm text-muted-foreground">
              來源銷貨單：{so?.docNo}
              <br />
              客戶：{so?.customerName ?? so?.customerId}
              <br />
              存檔後將產生單號，並從來源單帶入退貨明細。
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

/** 來源銷貨單 picker：關鍵字（單號/客戶）下拉、限可退狀態（SHIPPED/INVOICED/COMPLETED） */
function SoPickerInput({ onPick }: { onPick: (so: So) => void }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<So[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (kw: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          const resp = await listSo({ pageSize: 20, search: kw.trim() || undefined });
          const returnable = resp.items.filter((r) => ['SHIPPED', 'INVOICED', 'COMPLETED'].includes(r.status));
          setRows(returnable);
          setOpen(true);
          setHi(0);
        } catch {
          /* ignore */
        }
      })();
    }, 250);
  };

  const pick = (r: So) => {
    setText(`${r.docNo}　${r.customerName ?? ''}`);
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
        placeholder="輸入銷貨單號 / 客戶關鍵字"
        className="w-full rounded border bg-background px-2 py-1 font-mono text-sm"
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-[28rem] max-w-[80vw] overflow-auto rounded border border-border bg-card shadow-xl">
          {rows.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">無可退貨的銷貨單（限已出貨/已開立/已完成）</div>
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
                <span className="font-mono">{r.docNo}</span>　{r.customerName ?? r.customerId}
                <span className="ml-2 text-muted-foreground">{r.soDate.slice(0, 10)} · {fmt(r.totalAmount)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 內嵌明細編輯列：數量 / 退貨原因 / 好壞品處置（料號鎖定）。Enter 存檔、Esc 退出。 */
function SrInlineEditRow({
  srId,
  taxRate,
  editItem,
  onSaved,
  onExit,
}: {
  srId: string;
  taxRate: number;
  editItem: SrItem;
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const [qty, setQty] = useState(String(editItem.qty));
  const [reason, setReason] = useState(editItem.returnReason || 'C');
  const [dispo, setDispo] = useState(editItem.dispositionFlag ?? '');
  const [busy, setBusy] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    qtyRef.current?.focus();
  }, []);

  const commit = async () => {
    if (Number(qty) <= 0) {
      qtyRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await patchSrItem(srId, editItem.id, {
        qty: Number(qty),
        returnReason: reason,
        ...(dispo ? { dispositionFlag: dispo as 'G' | 'B' } : {}),
      });
      await onSaved();
      onExit();
    } catch (e) {
      alert(e instanceof Error ? e.message : '修改失敗');
    } finally {
      setBusy(false);
    }
  };

  const lineSub = (Number(qty) || 0) * (Number(editItem.unitPrice) || 0);
  const lineTax = Math.round((lineSub * taxRate) / 100);
  const cell = 'w-full rounded border border-primary/40 bg-background px-2 py-1 text-sm';
  const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

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
        <span className="font-mono text-[14px]">{editItem.partNo}　{editItem.partName}</span>
      </td>
      <td className="px-2 py-1">
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={cell}>
          {Object.entries(REASON_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{k} {v}</option>
          ))}
        </select>
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
              void commit();
            }
          }}
          className={`${cell} text-right tabular-nums`}
        />
      </td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(editItem.unitPrice)}</td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineSub)}</td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(lineTax)}</td>
      <td className="px-2 py-1">
        <select value={dispo} onChange={(e) => setDispo(e.target.value)} className={cell} disabled={busy}>
          <option value="">未檢查</option>
          <option value="G">G 好品</option>
          <option value="B">B 壞品</option>
        </select>
      </td>
      <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">Enter↵ / Esc</td>
    </tr>
  );
}

/** SR 明細表（純呈現） */
function SrItemsTable({
  items,
  taxRate,
  subtotal,
  taxAmount,
  totalAmount,
  editable,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  editingItemId,
  renderEditRow,
}: {
  items: SrItem[];
  taxRate: number;
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  editable: boolean;
  selectedItemId: string | null;
  onSelectItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  editingItemId?: string | null;
  renderEditRow?: (it: SrItem) => React.ReactNode;
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
  const pad = Math.max(0, fitRows - items.length);
  return (
    <div ref={scrollRef} className="flex-1 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-border/60 [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border/60">
        <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">序號</th>
            <th className="px-3 py-2 text-left">料號</th>
            <th className="px-3 py-2 text-left">品名</th>
            <th className="px-3 py-2 text-left">退貨原因</th>
            <th className="px-3 py-2 text-right">數量</th>
            <th className="px-3 py-2 text-right">單價</th>
            <th className="px-3 py-2 text-right">退款金額</th>
            <th className="px-3 py-2 text-right">稅額</th>
            <th className="px-3 py-2 text-left">處置</th>
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
                <td className="px-3 py-2 font-mono text-[14px]">{it.partNo}</td>
                <td className="px-3 py-2">{it.partName}</td>
                <td className="px-3 py-2 text-xs">{REASON_LABEL[it.returnReason] ?? it.returnReason}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(it.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(lineSub)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(lineTax)}</td>
                <td className="px-3 py-2 text-xs">
                  {it.dispositionFlag ? (
                    <span className={`rounded px-1.5 py-0.5 text-[11px] ${it.dispositionFlag === 'G' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                      {DISPOSITION_SHORT[it.dispositionFlag]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">未檢查</span>
                  )}
                </td>
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

/** 從來源銷貨單帶入退貨明細：列該 SO 全部行、每行可勾選＋退量＋原因（伺服器端驗證可退量） */
function SoLineAddDialog({
  soId,
  srDocNo,
  onClose,
  onConfirm,
}: {
  soId: string;
  srDocNo: string;
  onClose: () => void;
  onConfirm: (rows: { soItemId: string; qty: number; reason: string }[]) => void | Promise<void>;
}) {
  const [so, setSo] = useState<So | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const s = await getSo(soId);
        setSo(s);
        const q: Record<string, string> = {};
        const r: Record<string, string> = {};
        (s.items ?? []).forEach((it) => {
          q[it.id] = String(it.qty);
          r[it.id] = 'C';
        });
        setQtys(q);
        setReasons(r);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [soId]);

  const toggle = (itemId: string) =>
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(itemId)) n.delete(itemId);
      else n.add(itemId);
      return n;
    });

  const items: SoItem[] = so?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            從銷貨單帶入退貨明細　<span className="font-mono text-muted-foreground">{so?.docNo ?? ''}</span>
            <span className="ml-2 text-xs text-muted-foreground">→ {srDocNo}</span>
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉"><X className="h-4 w-4" /></button>
        </div>
        {err ? <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{err}</div> : null}
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">載入中…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">來源銷貨單無明細。</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-left">料號</th>
                  <th className="px-2 py-2 text-left">品名</th>
                  <th className="px-2 py-2 text-right">出貨量</th>
                  <th className="px-2 py-2 text-right">退量</th>
                  <th className="px-2 py-2 text-left">退貨原因</th>
                  <th className="px-2 py-2 text-right">單價</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-accent/10">
                    <td className="px-2 py-1.5 text-center">
                      <input type="checkbox" checked={checked.has(it.id)} onChange={() => toggle(it.id)} />
                    </td>
                    <td className="cursor-pointer px-2 py-1.5 font-mono text-[14px]" onClick={() => toggle(it.id)}>{it.partNo}</td>
                    <td className="cursor-pointer px-2 py-1.5" onClick={() => toggle(it.id)}>{it.partName}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{it.qty}</td>
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
                        value={reasons[it.id] ?? 'C'}
                        onChange={(e) => setReasons((p) => ({ ...p, [it.id]: e.target.value }))}
                        className="rounded border bg-background px-1 py-0.5 text-xs"
                      >
                        {Object.entries(REASON_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{k} {v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">退量超過「出貨量－已退量」時伺服器會擋下並提示。</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button
            type="button"
            disabled={checked.size === 0}
            onClick={() =>
              void onConfirm(
                items
                  .filter((it) => checked.has(it.id))
                  .map((it) => ({ soItemId: it.id, qty: Number(qtys[it.id]) || 0, reason: reasons[it.id] ?? 'C' }))
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

/** NX-DOC-PRINT：銷退單列印設定（DocPrintView 皮） */
function SrPrintSheet({ doc, onClose }: { doc: Sr; onClose: () => void }) {
  return (
    <DocPrintView
      title="銷　貨　退　回　單"
      docNo={doc.docNo}
      fields={[
        { label: '單號', value: doc.docNo },
        { label: '銷退日期', value: doc.srDate.slice(0, 10) },
        { label: '客戶編號', value: doc.customerCode ?? '' },
        { label: '客戶名稱', value: doc.customerName ?? '' },
        { label: '來源銷貨單', value: doc.soDocNo ?? '' },
        { label: '退回倉庫', value: doc.warehouseName ?? '' },
        { label: '退款方式', value: SR_METHOD_LABEL[doc.returnMethod] ?? doc.returnMethod },
        { label: '稅率', value: `${Number(doc.taxRate)}%` },
      ]}
      columns={[
        { label: '序', width: '6%', align: 'center', render: (it) => it.lineNo },
        { label: '料號', width: '18%', render: (it) => <span className="font-mono">{it.partNo}</span> },
        { label: '品名', render: (it) => it.partName },
        { label: '退貨原因', width: '12%', render: (it) => REASON_LABEL[it.returnReason] ?? it.returnReason },
        { label: '數量', width: '8%', align: 'right', render: (it) => Number(it.qty) },
        { label: '單價', width: '11%', align: 'right', render: (it) => printMoney(it.unitPrice) },
        { label: '金額', width: '12%', align: 'right', render: (it) => printMoney(it.lineAmount) },
        { label: '處置', width: '8%', align: 'center', render: (it) => (it.dispositionFlag ? DISPOSITION_SHORT[it.dispositionFlag] ?? it.dispositionFlag : '') },
      ]}
      items={doc.items ?? []}
      getRowKey={(it) => it.id}
      totals={[
        { label: '未稅金額', value: printMoney(doc.subtotal) },
        { label: `稅額（${Number(doc.taxRate)}%）`, value: printMoney(doc.taxAmount) },
        { label: '退款總額', value: printMoney(doc.totalAmount), strong: true },
      ]}
      note={doc.remark}
      signatures={['製單', '主管', '客戶確認']}
      onClose={onClose}
    />
  );
}
