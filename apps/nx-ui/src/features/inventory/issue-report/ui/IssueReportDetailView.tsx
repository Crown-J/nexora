// apps/nx-ui/src/features/inventory/issue-report/ui/IssueReportDetailView.tsx
// NX03-STOCK-LITE M3-3a：異常回報 - 詳情 + 狀態流轉 + 處置分流
//
// 流程：DRAFT → REPORTED →（dispose 選 5 處置 + relatedDocId）→ PROCESSING → CLOSED
// 任意階段 → CANCELLED（誤報 / 撤銷）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  cancelIssueReport,
  closeIssueReport,
  disposeIssueReport,
  getIssueReport,
  reportIssueReport,
  updateIssueReport,
} from '../api/issue-report';
import type {
  DispositionType,
  IssueReport,
  IssueType,
  UpdateIssueReportPayload,
} from '../types';
import {
  DISPOSITION_LABEL,
  ISSUE_LABEL,
  STATUS_LABEL,
} from './IssueReportListView';

const DISPOSITION_FORM_OPTIONS: { value: DispositionType; label: string }[] = [
  { value: 'R', label: 'R 退貨（→ Nx02Rr）' },
  { value: 'W', label: 'W 保固（→ Nx02WarrantyClaim）' },
  { value: 'C', label: 'C 重組分解（→ Nx03Conversion）' },
  { value: 'D', label: 'D 報廢（→ Nx03Disposal）' },
  { value: 'N', label: 'N 未處置' },
];

const ISSUE_EDIT_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'D', label: 'D 損毀' },
  { value: 'E', label: 'E 過期' },
  { value: 'S', label: 'S 數量短缺' },
  { value: 'L', label: 'L 放錯庫位' },
  { value: 'O', label: 'O 其他' },
];

export function IssueReportDetailView({ id }: { id: string }) {
  const [ir, setIr] = useState<IssueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIssueReport(id);
      setIr(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handle = async (fn: () => Promise<unknown>, prefix: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(`${prefix}: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !ir) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !ir) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!ir) return null;

  const editable = ir.status === 'DRAFT' || ir.status === 'REPORTED';
  const canCancel = ir.status !== 'CLOSED' && ir.status !== 'CANCELLED';

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · ISSUE REPORT</p>
          <h1 className="text-2xl font-mono font-semibold">{ir.docNo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              狀態：{STATUS_LABEL[ir.status] ?? ir.status}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              異常：{ir.issueType} {ISSUE_LABEL[ir.issueType] ?? ''}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              處置：{ir.dispositionType} {DISPOSITION_LABEL[ir.dispositionType] ?? ''}
            </span>
            <span className="text-muted-foreground">日期：{ir.reportDate.slice(0, 10)}</span>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
            <div>倉庫：{ir.warehouse?.code ?? ir.warehouseId}</div>
            <div>庫位：{ir.locationId ? (ir.location?.code ?? ir.locationId) : '—'}</div>
            <div>料號：<span className="font-mono">{ir.partNo}</span> · {ir.partName}</div>
            <div>數量：<span className="tabular-nums">{ir.qty}</span></div>
            {ir.relatedDocId ? <div>關聯處置單：<span className="font-mono">{ir.relatedDocId}</span></div> : null}
            {ir.sourceModule ? (
              <div>
                來源：{ir.sourceModule}
                {ir.sourceDocType ? ` / ${ir.sourceDocType}` : ''}
                {ir.sourceDocId ? ` / ${ir.sourceDocId}` : ''}
              </div>
            ) : null}
            {ir.closedAt ? <div>結案時間：{new Date(ir.closedAt).toLocaleString()}</div> : null}
          </div>
          {ir.description ? (
            <p className="mt-2 whitespace-pre-wrap rounded border bg-muted/30 p-2 text-sm">
              {ir.description}
            </p>
          ) : null}
        </div>
        <Link href="/dashboard/inventory/issue-report" className="text-sm text-primary hover:underline">
          ← 返回列表
        </Link>
      </header>

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      <StatusActions
        ir={ir}
        busy={busy}
        onReport={() => handle(() => reportIssueReport(ir.id), '提交失敗')}
        onDispose={(payload) => handle(() => disposeIssueReport(ir.id, payload), '處置失敗')}
        onClose={(remark) =>
          handle(() => closeIssueReport(ir.id, remark ? { remark } : {}), '結案失敗')
        }
        onCancel={() => handle(() => cancelIssueReport(ir.id), '作廢失敗')}
        canCancel={canCancel}
      />

      {editable ? (
        <EditForm
          ir={ir}
          busy={busy}
          onSubmit={(payload) => handle(() => updateIssueReport(ir.id, payload), '修改失敗')}
        />
      ) : null}
    </div>
  );
}

function StatusActions(props: {
  ir: IssueReport;
  busy: boolean;
  canCancel: boolean;
  onReport: () => Promise<void>;
  onDispose: (payload: { dispositionType: DispositionType; relatedDocId?: string }) => Promise<void>;
  onClose: (remark: string) => Promise<void>;
  onCancel: () => Promise<void>;
}) {
  const { ir, busy, canCancel, onReport, onDispose, onClose, onCancel } = props;
  const [dispType, setDispType] = useState<DispositionType>('N');
  const [relatedDocId, setRelatedDocId] = useState('');
  const [closeRemark, setCloseRemark] = useState('');

  return (
    <section className="space-y-3 rounded border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">流程：</span>
        {ir.status === 'DRAFT' ? (
          <button
            disabled={busy}
            onClick={() => void onReport()}
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
          >
            1️⃣ 提交（DRAFT → REPORTED）
          </button>
        ) : null}
        {canCancel ? (
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm('確認作廢此異常單？')) void onCancel();
            }}
            className="ml-auto rounded border px-3 py-1 text-sm text-muted-foreground hover:bg-destructive/10 disabled:opacity-50"
          >
            作廢
          </button>
        ) : null}
      </div>

      {ir.status === 'REPORTED' ? (
        <div className="grid gap-2 rounded border bg-background p-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm">
            <span className="block mb-1 text-xs text-muted-foreground">2️⃣ 處置分流 *</span>
            <select
              value={dispType}
              onChange={(e) => setDispType(e.target.value as DispositionType)}
              className="w-full rounded border bg-background px-2 py-1"
            >
              {DISPOSITION_FORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-xs text-muted-foreground">關聯處置單 ID（軟連結、可後補）</span>
            <input
              value={relatedDocId}
              onChange={(e) => setRelatedDocId(e.target.value)}
              placeholder="如 NX02RR... / NX03CV..."
              className="w-full rounded border bg-background px-2 py-1 font-mono text-xs"
            />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              void onDispose({
                dispositionType: dispType,
                relatedDocId: relatedDocId.trim() || undefined,
              })
            }
            className="self-end rounded bg-amber-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            送出處置 (REPORTED → PROCESSING)
          </button>
        </div>
      ) : null}

      {ir.status === 'PROCESSING' ? (
        <div className="grid gap-2 rounded border bg-background p-3 md:grid-cols-[1fr_auto]">
          <label className="text-sm">
            <span className="block mb-1 text-xs text-muted-foreground">3️⃣ 結案備註（追加到 description）</span>
            <input
              value={closeRemark}
              onChange={(e) => setCloseRemark(e.target.value)}
              placeholder="處置結果、客戶溝通、後續追蹤…"
              className="w-full rounded border bg-background px-2 py-1"
            />
          </label>
          <button
            disabled={busy}
            onClick={() => void onClose(closeRemark.trim())}
            className="self-end rounded bg-green-700 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            結案 (PROCESSING → CLOSED)
          </button>
        </div>
      ) : null}
    </section>
  );
}

function EditForm(props: {
  ir: IssueReport;
  busy: boolean;
  onSubmit: (payload: UpdateIssueReportPayload) => Promise<void>;
}) {
  const { ir, busy, onSubmit } = props;
  const [issueType, setIssueType] = useState<IssueType>(ir.issueType);
  const [qty, setQty] = useState(String(ir.qty));
  const [locationId, setLocationId] = useState(ir.locationId ?? '');
  const [reportDate, setReportDate] = useState(ir.reportDate.slice(0, 10));
  const [description, setDescription] = useState(ir.description ?? '');

  const requireLocation = issueType === 'L';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UpdateIssueReportPayload = {};
    if (issueType !== ir.issueType) payload.issueType = issueType;
    if (qty !== String(ir.qty)) payload.qty = Number(qty);
    if (locationId.trim() !== (ir.locationId ?? '')) payload.locationId = locationId.trim();
    if (reportDate !== ir.reportDate.slice(0, 10)) payload.reportDate = reportDate;
    if ((description ?? '') !== (ir.description ?? '')) payload.description = description;
    if (Object.keys(payload).length === 0) return;
    await onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/20 p-3">
      <h2 className="text-sm font-semibold">編輯（僅 DRAFT / REPORTED 可改）</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="block mb-1">🟢 異常類型</span>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as IssueType)}
            className="w-full rounded border bg-background px-2 py-1"
          >
            {ISSUE_EDIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 數量</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 tabular-nums"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">
            {requireLocation ? '🟢' : '🟡'} 庫位 ID {requireLocation ? '*' : '(可空)'}
          </span>
          <input
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="NX01LOC..."
            className="w-full rounded border bg-background px-2 py-1 font-mono text-xs"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟡 回報日</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
        <label className="text-sm md:col-span-2 lg:col-span-4">
          <span className="block mb-1">⚪ 描述</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        儲存修改
      </button>
    </form>
  );
}
