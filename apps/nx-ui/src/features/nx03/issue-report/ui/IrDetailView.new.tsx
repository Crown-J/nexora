// apps/nx-ui/src/features/nx03/issue-report/ui/IrDetailView.new.tsx
// W5-ISSUE-CHAIN Step 4：異常回報詳情面板（比照 TiDetailView.new 模板：左表頭 + 右流程處置卡）
//   IR 專屬：狀態流（草稿→已回報→處置中→已結案 / 任意階段作廢）、
//   處置分流彈窗＝一鍵開單（報廢任何來源可自動建；退廠商/保固限進貨驗收來源）或連結既有單據、
//   來源單據 / 關聯處置單都給可點連結；處置單完成後端自動回寫結案（Step 3）。
'use client';

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  Split,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';

import {
  cancelIssueReport,
  closeIssueReport,
  createIssueReport,
  disposeIssueReport,
  getIssueReport,
  reportIssueReport,
  updateIssueReport,
} from '@data/endpoints/nx03/issue-report/api/issue-report';
import { listLocation } from '@data/endpoints/shared/master/location/api/location';
import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';
import type { DispositionType, IssueReport, IssueType } from '@data/types/nx03/issue-report';
import {
  IR_DISPOSITION_LABEL,
  IR_ISSUE_LABEL,
  IR_STATUS_LABEL,
  ISSUE_TYPES,
} from '@data/types/nx03/issue-report';

import { irSourceLabel } from './IrWorkbench';

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

type LocOpt = { id: string; code: string };
type WhOpt = { id: string; code: string; name: string };

async function loadLocs(warehouseId: string): Promise<LocOpt[]> {
  try {
    const res = await listLocation({ page: 1, pageSize: 200, warehouseId, isActive: true });
    return res.items.map((l) => ({ id: l.id, code: l.code }));
  } catch {
    return [];
  }
}

/** 來源單據 → 前端路由（NX 代碼不露、只做已知單據） */
function sourceDocHref(r: Pick<IssueReport, 'sourceModule' | 'sourceDocType' | 'sourceDocId'>): string | null {
  if (!r.sourceModule || !r.sourceDocId) return null;
  const id = encodeURIComponent(r.sourceDocId);
  const key = `${r.sourceModule}/${r.sourceDocType ?? ''}`;
  const map: Record<string, string> = {
    'NX02/RR': `/dashboard/purchase/rr/${id}`,
    'NX03/STOCKTAKE': `/dashboard/inventory/stock-take/${id}`,
    'NX04/SR': `/dashboard/sale/return/${id}`,
    'NX04/SO': `/dashboard/sale/so/${id}`,
    'NX04/QT': `/dashboard/sale/qt/${id}`,
  };
  return map[key] ?? null;
}

/** 關聯處置單 → 前端路由（保固無 [id] 詳情頁 → 回 null、呈現純文字＋列表連結） */
function relatedDocHref(disposition: DispositionType, docId: string): string | null {
  const id = encodeURIComponent(docId);
  switch (disposition) {
    case 'R':
      return `/dashboard/purchase/pr/${id}`;
    case 'D':
      return `/dashboard/inventory/disposal/${id}`;
    case 'C':
      return `/dashboard/inventory/conversion/${id}`;
    case 'X':
      return `/dashboard/sale/so/${id}`;
    default:
      return null;
  }
}

export function IrDetailPanel({
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
  const [ir, setIr] = useState<IssueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // IR 無明細行：editItems 一律當 editHeader
  const [mode, setMode] = useState<'browse' | 'editHeader'>(initialMode === 'browse' ? 'browse' : 'editHeader');
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [locs, setLocs] = useState<LocOpt[]>([]);

  // 表頭可編欄位（DRAFT / REPORTED）
  const [reportDate, setReportDate] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('D');
  const [qty, setQty] = useState('0');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setIr(await getIssueReport(id));
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
    if (!ir) return;
    setReportDate(ir.reportDate.slice(0, 10));
    setIssueType(ir.issueType);
    setQty(String(Number(ir.qty)));
    setLocationId(ir.locationId ?? '');
    setDescription(ir.description ?? '');
  }, [ir?.id, ir?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ir?.warehouseId) return;
    void loadLocs(ir.warehouseId).then(setLocs);
  }, [ir?.warehouseId]);

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

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

  if (loading && !ir) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !ir) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!ir) return null;

  const s = ir.status;
  const editable = s === 'DRAFT' || s === 'REPORTED';
  const headerEditing = mode === 'editHeader' && editable;
  const canCancel = s !== 'CLOSED' && s !== 'CANCELLED';

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateIssueReport(id, {
        reportDate,
        issueType,
        qty: Number(qty) || 0,
        locationId: locationId || undefined,
        description: description.trim() || undefined,
      });
      setMode('browse');
      await reloadAll();
    } catch (e) {
      setError(`存檔: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (ir) {
      setReportDate(ir.reportDate.slice(0, 10));
      setIssueType(ir.issueType);
      setQty(String(Number(ir.qty)));
      setLocationId(ir.locationId ?? '');
      setDescription(ir.description ?? '');
    }
    setMode('browse');
  }

  function doReport() {
    if (!window.confirm('提交異常回報？（向倉管 / 主管出聲、進入待處置）')) return;
    void handle(() => reportIssueReport(id), '提交');
  }
  function doCancel() {
    const warn =
      s === 'PROCESSING'
        ? `此異常單已在處置中。作廢異常單不會動到已建立的處置單、確定作廢 ${ir!.docNo}？`
        : `作廢異常回報單 ${ir!.docNo}？（誤報 / 撤銷）`;
    if (!window.confirm(warn)) return;
    void handle(() => cancelIssueReport(id), '作廢');
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60';
  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-foreground';

  const srcHref = sourceDocHref(ir);
  const relHref = ir.relatedDocId ? relatedDocHref(ir.dispositionType, ir.relatedDocId) : null;

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
              <ToolbarButton icon={Trash2} letter="D" label="作廢" enabled={canCancel && !busy} variant="danger" onClick={doCancel} />
              <ToolbarSeparator />
              {s === 'DRAFT' ? <ToolbarButton icon={Send} letter="G" label="提交" enabled={!busy} accent onClick={doReport} /> : null}
              {s === 'REPORTED' ? (
                <ToolbarButton icon={Split} letter="G" label="處置分流" enabled={!busy} accent onClick={() => setDisposeOpen(true)} />
              ) : null}
              {s === 'PROCESSING' ? (
                <ToolbarButton icon={CheckCircle2} letter="G" label="結案" enabled={!busy} accent onClick={() => setCloseOpen(true)} />
              ) : null}
              <ToolbarSeparator />
              <ToolbarButton icon={Search} letter="F" label="查詢" enabled={!!onSearch} onClick={onSearch} />
              <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={() => void reload()} />
            </>
          ) : (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => void saveHeader()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={cancelEdit} />
            </>
          )}
          <div className="flex-1" />
          {mode === 'browse' && s === 'PROCESSING' ? (
            <span className="px-1 text-[11px] text-amber-600">⚠ 處置中：處置單過帳 / 保固出結果後本單自動結案（也可手動結案）</span>
          ) : null}
        </div>
      </ToolbarPortal>

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 */}
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號"><input readOnly value={ir.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={IR_STATUS_LABEL[s] ?? s} className={roCls} /></FieldRow>
          <FieldRow label="回報日期"><input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="異常類型">
            <select value={issueType} onChange={(e) => setIssueType(e.target.value as IssueType)} disabled={!headerEditing} className={inputCls}>
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>{IR_ISSUE_LABEL[t]}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="料號"><input readOnly value={ir.partNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="品名"><input readOnly value={ir.partName} className={roCls} /></FieldRow>
          <FieldRow label="數量"><input type="number" min="0" step="0.0001" value={qty} onChange={(e) => setQty(e.target.value)} disabled={!headerEditing} className={`${inputCls} tabular-nums`} /></FieldRow>
          <FieldRow label="倉庫"><input readOnly value={ir.warehouse ? `${ir.warehouse.code}　${ir.warehouse.name}` : ir.warehouseId} className={roCls} /></FieldRow>
          <FieldRow label="庫位">
            {headerEditing ? (
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputCls}>
                <option value="">（不指定{issueType === 'L' ? '、放錯庫位必選' : ''}）</option>
                {locs.map((l) => (
                  <option key={l.id} value={l.id}>{l.code}</option>
                ))}
              </select>
            ) : (
              <input readOnly value={ir.location?.code ?? (ir.locationId ? ir.locationId : '—')} className={roCls} />
            )}
          </FieldRow>
          <FieldRow label="建單人員"><input readOnly value={ir.createdByName ?? ir.createdBy} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={ir.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">描述 / 處理紀錄：</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!headerEditing} rows={6} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>
        </section>

        {/* 右：流程 + 來源 / 處置連結卡 */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto">
          <div className="rounded-lg border border-border/40 bg-card p-4">
            <div className="mb-2 text-xs text-muted-foreground">處理流程</div>
            <FlowSteps status={s} />
          </div>

          <div className="rounded-lg border border-border/40 bg-card p-4">
            <div className="mb-2 text-xs text-muted-foreground">異常來源</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded bg-muted px-2 py-0.5 text-xs">{irSourceLabel(ir)}</span>
              {ir.sourceDocId ? (
                srcHref ? (
                  <Link href={srcHref} className="font-mono text-xs text-primary hover:underline">{ir.sourceDocId}</Link>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">{ir.sourceDocId}</span>
                )
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-card p-4">
            <div className="mb-2 text-xs text-muted-foreground">處置分流</div>
            {ir.dispositionType === 'N' ? (
              <div className="text-sm text-muted-foreground">
                未處置。{s === 'REPORTED' ? '按工具列「處置分流」選出路（一鍵開單或連結既有單據）。' : s === 'DRAFT' ? '先提交、再處置。' : ''}
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <div>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{IR_DISPOSITION_LABEL[ir.dispositionType] ?? ir.dispositionType}</span>
                </div>
                {ir.relatedDocId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">關聯處置單：</span>
                    {relHref ? (
                      <Link href={relHref} className="font-mono text-xs text-primary hover:underline">{ir.relatedDocId}</Link>
                    ) : (
                      <>
                        <span className="font-mono text-xs">{ir.relatedDocId}</span>
                        {ir.dispositionType === 'W' ? (
                          <Link href="/dashboard/purchase/warranty" className="text-xs text-primary hover:underline">（保固列表）</Link>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">尚未連結處置單（可再按「處置分流」補）。</div>
                )}
                {s === 'PROCESSING' ? (
                  <div className="text-xs text-muted-foreground">處置單過帳 / 保固出結果後、本單自動結案。</div>
                ) : null}
              </div>
            )}
            {ir.closedAt ? (
              <div className="mt-2 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                結案時間：{new Date(ir.closedAt).toLocaleString()}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {disposeOpen ? (
        <IrDisposeDialog
          ir={ir}
          onClose={() => setDisposeOpen(false)}
          onDone={async () => {
            setDisposeOpen(false);
            await reloadAll();
          }}
        />
      ) : null}

      {closeOpen ? (
        <IrCloseDialog
          docNo={ir.docNo}
          onClose={() => setCloseOpen(false)}
          onSubmit={async (remark) => {
            setCloseOpen(false);
            await handle(() => closeIssueReport(id, remark ? { remark } : {}), '結案');
          }}
        />
      ) : null}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

const FLOW_STEPS = ['DRAFT', 'REPORTED', 'PROCESSING', 'CLOSED'] as const;

function FlowSteps({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return <div className="text-sm text-muted-foreground">已作廢（誤報 / 撤銷）。</div>;
  }
  const cur = FLOW_STEPS.indexOf(status as (typeof FLOW_STEPS)[number]);
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {FLOW_STEPS.map((st, i) => (
        <span key={st} className="flex items-center gap-1">
          {i > 0 ? <span className="text-muted-foreground">→</span> : null}
          <span
            className={`rounded px-2 py-0.5 ${
              i < cur ? 'bg-muted text-muted-foreground' : i === cur ? 'bg-primary text-primary-foreground' : 'border border-border/40 text-muted-foreground'
            }`}
          >
            {IR_STATUS_LABEL[st]}
          </span>
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 處置分流彈窗：一鍵開單（預設） / 連結既有單據
// ─────────────────────────────────────────────

/** R/W 一鍵開單前提：進貨驗收來源（後端同守則、前端先擋提升體驗） */
function canAutoCreate(ir: IssueReport, disp: DispositionType): boolean {
  if (disp === 'D') return true;
  if (disp === 'R' || disp === 'W') {
    return ir.sourceModule === 'NX02' && ir.sourceDocType === 'RR' && !!ir.relatedDocId;
  }
  return false;
}

function IrDisposeDialog({
  ir,
  onClose,
  onDone,
}: {
  ir: IssueReport;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [disp, setDisp] = useState<DispositionType>('D');
  const [linkMode, setLinkMode] = useState<'auto' | 'link'>('auto');
  const [relatedDocId, setRelatedDocId] = useState('');
  const [xCustomerId, setXCustomerId] = useState('');
  const [xUnitPrice, setXUnitPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const auto = canAutoCreate(ir, disp);
  const effectiveMode: 'auto' | 'link' | 'none' =
    disp === 'N' ? 'none' : disp === 'X' ? 'none' : auto ? linkMode : 'link';

  async function submit() {
    setErr(null);
    const payload: Parameters<typeof disposeIssueReport>[1] = { dispositionType: disp };
    if (effectiveMode === 'auto') {
      payload.autoCreate = true;
    } else if (effectiveMode === 'link') {
      if (!relatedDocId.trim()) {
        setErr(disp === 'C' ? '重組分解需先手動建單、再回填單據 ID 連結' : '請填要連結的既有單據 ID');
        return;
      }
      payload.relatedDocId = relatedDocId.trim();
    } else if (disp === 'X') {
      if (relatedDocId.trim()) {
        payload.relatedDocId = relatedDocId.trim();
      } else {
        if (!xCustomerId.trim()) {
          setErr('特價售出必填買家 ID');
          return;
        }
        const price = Number(xUnitPrice);
        if (!Number.isFinite(price) || price < 0) {
          setErr('特價售出必填特價單價 ≥ 0');
          return;
        }
        payload.customerId = xCustomerId.trim();
        payload.unitPrice = price;
        payload.warehouseId = ir.warehouseId;
      }
    }
    setBusy(true);
    try {
      await disposeIssueReport(ir.id, payload);
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '處置失敗');
      setBusy(false);
    }
  }

  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="relative w-full max-w-lg space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">處置分流 — {ir.docNo}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">處置方式</span>
          <select
            value={disp}
            onChange={(e) => {
              setDisp(e.target.value as DispositionType);
              setLinkMode('auto');
              setErr(null);
            }}
            className={cls}
          >
            <option value="D">{IR_DISPOSITION_LABEL.D}</option>
            <option value="R">{IR_DISPOSITION_LABEL.R}</option>
            <option value="W">{IR_DISPOSITION_LABEL.W}</option>
            <option value="C">{IR_DISPOSITION_LABEL.C}</option>
            <option value="X">{IR_DISPOSITION_LABEL.X}</option>
            <option value="N">{IR_DISPOSITION_LABEL.N}（先分流、單據後補）</option>
          </select>
        </label>

        {disp === 'R' || disp === 'W' || disp === 'D' ? (
          auto ? (
            <div className="space-y-2 rounded border border-border/40 bg-muted/20 p-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={linkMode === 'auto'} onChange={() => setLinkMode('auto')} />
                <span>一鍵開單（自動建{IR_DISPOSITION_LABEL[disp]}草稿、資料自異常單帶入）</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={linkMode === 'link'} onChange={() => setLinkMode('link')} />
                <span>連結既有單據</span>
              </label>
            </div>
          ) : (
            <div className="rounded border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-600">
              此異常單非進貨驗收來源（無原進貨明細）、無法一鍵開{IR_DISPOSITION_LABEL[disp]}；請手動建單後在下方連結。
            </div>
          )
        ) : null}

        {disp === 'C' ? (
          <div className="rounded border border-border/40 bg-muted/20 p-2 text-xs text-muted-foreground">
            重組分解的產出明細需人工定義：請先到「重組分解」建單、再回來連結單據 ID。
          </div>
        ) : null}

        {effectiveMode === 'link' || disp === 'C' ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">既有單據 ID（系統會驗證存在）</span>
            <input value={relatedDocId} onChange={(e) => setRelatedDocId(e.target.value)} placeholder="貼上處置單 ID" className={`${cls} font-mono text-xs`} />
          </label>
        ) : null}

        {disp === 'X' ? (
          <div className="space-y-2 rounded border border-amber-500/40 bg-amber-500/5 p-2">
            <div className="text-xs text-amber-600">特價售出：未連結既有銷貨單時、自動開特價銷貨單（成本走平均成本、售價填下方特價）。</div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">連結既有銷貨單 ID（可空 = 自動開單）</span>
              <input value={relatedDocId} onChange={(e) => setRelatedDocId(e.target.value)} className={`${cls} font-mono text-xs`} />
            </label>
            {!relatedDocId.trim() ? (
              <div className="grid gap-2 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">買家 ID *</span>
                  <input value={xCustomerId} onChange={(e) => setXCustomerId(e.target.value)} className={`${cls} font-mono text-xs`} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">特價單價 *</span>
                  <input type="number" min="0" step="0.01" value={xUnitPrice} onChange={(e) => setXUnitPrice(e.target.value)} className={`${cls} tabular-nums`} />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {err ? <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">{err}</div> : null}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button type="submit" disabled={busy} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? '送出中…' : '送出處置'}
          </button>
        </div>
      </form>
    </div>
  );
}

function IrCloseDialog({
  docNo,
  onClose,
  onSubmit,
}: {
  docNo: string;
  onClose: () => void;
  onSubmit: (remark: string) => Promise<void>;
}) {
  const [remark, setRemark] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(remark.trim());
        }}
        className="relative w-full max-w-md space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">結案 — {docNo}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">結案備註（追加到描述、如：短交已折讓 / 已補貨）</span>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} autoFocus className="w-full rounded border bg-background px-2 py-1 text-sm" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button type="submit" className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">結案</button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────
// 新增面板：倉庫 / 庫位下拉 + 料號搜尋（取代舊版手貼 ID）
// ─────────────────────────────────────────────

export function IrCreatePanel({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [warehouses, setWarehouses] = useState<WhOpt[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [locs, setLocs] = useState<LocOpt[]>([]);
  const [locationId, setLocationId] = useState('');
  const [part, setPart] = useState<PickedPart | null>(null);
  const [qty, setQty] = useState('1');
  const [issueType, setIssueType] = useState<IssueType>('D');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listWarehouses({ page: 1, pageSize: 200, isActive: true });
        setWarehouses(res.items.map((w) => ({ id: w.id, code: w.code, name: w.name })));
      } catch {
        /* 撈不到不擋、送出時後端會驗 */
      }
    })();
  }, []);

  useEffect(() => {
    if (!warehouseId) return;
    void loadLocs(warehouseId).then(setLocs);
  }, [warehouseId]);

  const requireLocation = issueType === 'L';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId) {
      setErr('請選倉庫');
      return;
    }
    if (!part) {
      setErr('請選料號');
      return;
    }
    if (requireLocation && !locationId) {
      setErr('放錯庫位類型、庫位必選');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const ir = await createIssueReport({
        reportDate,
        warehouseId,
        locationId: locationId || undefined,
        partId: part.id,
        qty: Number(qty) || 0,
        issueType,
        description: description.trim() || undefined,
      });
      onCreated(ir.id);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '建立失敗');
      setBusy(false);
    }
  }

  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-6">
      <form onSubmit={submit} className="w-full max-w-xl space-y-3 rounded-lg border border-border/40 bg-card p-5">
        <h2 className="text-sm font-semibold">新增異常回報（手動回報；驗收 / 盤點 / 銷退異常由系統自動產生）</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">倉庫 *</span>
            <select
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setLocationId('');
                if (!e.target.value) setLocs([]);
              }}
              className={cls}
              required
            >
              <option value="">請選擇</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code}　{w.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">庫位 {requireLocation ? '*（放錯庫位必選）' : '（可空）'}</span>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={cls} disabled={!warehouseId}>
              <option value="">（不指定）</option>
              {locs.map((l) => (
                <option key={l.id} value={l.id}>{l.code}</option>
              ))}
            </select>
          </label>
          <div className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">料號 *</span>
            {part ? (
              <div className="flex items-center gap-2 rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm">
                <span className="font-mono">{part.code}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{part.name}</span>
                <button type="button" onClick={() => setPart(null)} className="rounded p-0.5 hover:bg-accent/20" aria-label="重選料號">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <PartPicker onPick={setPart} autoFocus />
            )}
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">數量 *</span>
            <input type="number" min="0" step="0.0001" value={qty} onChange={(e) => setQty(e.target.value)} className={`${cls} tabular-nums`} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">異常類型 *</span>
            <select value={issueType} onChange={(e) => setIssueType(e.target.value as IssueType)} className={cls}>
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>{IR_ISSUE_LABEL[t]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">回報日期 *</span>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className={cls} required />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">描述（事件經過 / 處理建議）</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${cls} resize-y`} />
          </label>
        </div>
        {err ? <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">{err}</div> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border px-4 py-1.5 text-sm">取消</button>
          <button type="submit" disabled={busy} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? '建立中…' : '建立並進入'}
          </button>
        </div>
      </form>
    </div>
  );
}
