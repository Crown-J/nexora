// apps/nx-ui/src/features/inventory/issue-report/ui/IssueReportListView.tsx
// NX03-STOCK-LITE M3-3a：異常回報工作台 - 列表 + 快速新增
//
// LITE 範式：空畫面 + 全鍵盤（N=新增 / R=重新整理）+ 桌面優先
// 5 異常：D=損毀 / E=過期 / S=數量短缺 / L=放錯庫位（locationId 必填） / O=其他
// 5 處置：R=退貨 / W=保固 / C=重組分解 / D=報廢 / N=未處置

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createIssueReport, listIssueReport } from '@data/endpoints/nx03/issue-report/api/issue-report';
import type {
  CreateIssueReportPayload,
  DispositionType,
  IssueReport,
  IssueStatus,
  IssueType,
} from '@data/types/nx03/issue-report';

const STATUS_OPTIONS: { value: IssueStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'REPORTED', label: '已回報' },
  { value: 'PROCESSING', label: '處置中' },
  { value: 'CLOSED', label: '已結案' },
  { value: 'CANCELLED', label: '已作廢' },
];

const ISSUE_OPTIONS: { value: IssueType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'D', label: 'D 損毀' },
  { value: 'E', label: 'E 過期' },
  { value: 'S', label: 'S 數量短缺' },
  { value: 'L', label: 'L 放錯庫位' },
  { value: 'O', label: 'O 其他' },
];

const DISPOSITION_OPTIONS: { value: DispositionType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'R', label: 'R 退貨' },
  { value: 'W', label: 'W 保固' },
  { value: 'C', label: 'C 重組分解' },
  { value: 'D', label: 'D 報廢' },
  { value: 'N', label: 'N 未處置' },
];

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  REPORTED: '已回報',
  PROCESSING: '處置中',
  CLOSED: '已結案',
  CANCELLED: '已作廢',
};

export const ISSUE_LABEL: Record<string, string> = {
  D: '損毀',
  E: '過期',
  S: '數量短缺',
  L: '放錯庫位',
  O: '其他',
};

export const DISPOSITION_LABEL: Record<string, string> = {
  R: '退貨',
  W: '保固',
  C: '重組分解',
  D: '報廢',
  N: '未處置',
  // F1 特價售出 2026-06-08：第 6 處置
  X: '特價售出',
};

export function IssueReportListView() {
  const router = useRouter();
  const [rows, setRows] = useState<IssueReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<IssueStatus | ''>('');
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [dispositionType, setDispositionType] = useState<DispositionType | ''>('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listIssueReport({
        status: status || undefined,
        issueType: issueType || undefined,
        dispositionType: dispositionType || undefined,
        search: search.trim() || undefined,
        pageSize: 50,
      });
      setRows(resp.items);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'list 失敗');
    } finally {
      setLoading(false);
    }
  }, [status, issueType, dispositionType, search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowNew((v) => !v);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void reload();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reload]);

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · ISSUE REPORT</p>
        <h1 className="text-2xl font-semibold tracking-tight">異常回報</h1>
        <p className="text-sm text-muted-foreground">
          DRAFT → REPORTED → PROCESSING → CLOSED。5 異常 × 5 處置。鍵盤：
          <kbd className="rounded border px-1">N</kbd> 新增 ·
          <kbd className="ml-1 rounded border px-1">R</kbd> 重新整理
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          狀態：
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as IssueStatus | '')}
            className="rounded border bg-background px-2 py-1"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          異常類型：
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as IssueType | '')}
            className="rounded border bg-background px-2 py-1"
          >
            {ISSUE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          處置：
          <select
            value={dispositionType}
            onChange={(e) => setDispositionType(e.target.value as DispositionType | '')}
            className="rounded border bg-background px-2 py-1"
          >
            {DISPOSITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          搜尋：
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void reload()}
            placeholder="單號 / 料號 / 品名 / 描述"
            className="rounded border bg-background px-2 py-1"
          />
        </label>
        <button
          onClick={() => void reload()}
          className="rounded border px-3 py-1 text-sm hover:bg-muted"
        >
          重新整理
        </button>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          {showNew ? '取消新增' : '新增異常 (N)'}
        </button>
      </section>

      {showNew ? (
        <QuickCreateForm onCreated={(id) => router.push(`/dashboard/inventory/issue-report/${id}`)} />
      ) : null}

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {loading && !rows.length ? <div className="text-sm text-muted-foreground">載入中…</div> : null}

      {!loading && !rows.length && !error ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          尚無異常回報。按 <kbd className="rounded border px-1">N</kbd> 新增一筆。
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">單號</th>
                <th className="px-3 py-2 text-left">回報日</th>
                <th className="px-3 py-2 text-left">倉庫 / 庫位</th>
                <th className="px-3 py-2 text-left">料號 / 品名</th>
                <th className="px-3 py-2 text-right">數量</th>
                <th className="px-3 py-2 text-left">異常</th>
                <th className="px-3 py-2 text-left">處置</th>
                <th className="px-3 py-2 text-left">狀態</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/50">
                  <td className="px-3 py-2 font-mono">{r.docNo}</td>
                  <td className="px-3 py-2">{r.reportDate.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{r.warehouse?.code ?? r.warehouseId}</div>
                    {r.locationId ? (
                      <div className="text-muted-foreground">{r.location?.code ?? r.locationId}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-mono">{r.partNo}</div>
                    <div className="text-muted-foreground">{r.partName}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.qty}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {r.issueType} {ISSUE_LABEL[r.issueType] ?? ''}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {r.dispositionType} {DISPOSITION_LABEL[r.dispositionType] ?? ''}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/dashboard/inventory/issue-report/${r.id}`}
                      className="text-primary hover:underline"
                    >
                      進入 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <footer className="text-xs text-muted-foreground">共 {total} 筆</footer>
    </div>
  );
}

function QuickCreateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState('1');
  const [issueType, setIssueType] = useState<IssueType>('D');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const requireLocation = issueType === 'L';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId.trim() || !partId.trim()) {
      setErr('warehouseId / partId 必填');
      return;
    }
    if (requireLocation && !locationId.trim()) {
      setErr('issueType=L 放錯庫位、locationId 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateIssueReportPayload = {
        warehouseId: warehouseId.trim(),
        locationId: locationId.trim() || undefined,
        partId: partId.trim(),
        qty: Number(qty) || 0,
        issueType,
        reportDate,
        description: description.trim() || undefined,
      };
      const ir = await createIssueReport(payload);
      onCreated(ir.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">新增異常回報</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="block mb-1">🟢 倉庫 ID *</span>
          <input
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            placeholder="NX01WHSE..."
            className="w-full rounded border bg-background px-2 py-1"
            required
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
            className="w-full rounded border bg-background px-2 py-1"
            required={requireLocation}
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 料號 ID *</span>
          <input
            value={partId}
            onChange={(e) => setPartId(e.target.value)}
            placeholder="NX01PART..."
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 數量 *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 tabular-nums"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 異常類型 *</span>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as IssueType)}
            className="w-full rounded border bg-background px-2 py-1"
          >
            {ISSUE_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {requireLocation ? (
            <span className="mt-1 block text-xs text-amber-600">⚠️ 放錯庫位、locationId 必填</span>
          ) : null}
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟡 回報日 *</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="block mb-1">⚪ 描述</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="事件經過 / 處理建議"
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
      </div>
      {err ? <div className="text-xs text-destructive">{err}</div> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {busy ? '建立中…' : '建立並進入'}
      </button>
    </form>
  );
}
