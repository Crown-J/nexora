// apps/nx-ui/src/features/shared/issue-report-trigger/IssueReportTrigger.tsx
// NX04-M3 C6：跨單據問題回報共用觸發按鈕 + modal
//
// 用法：
//   <IssueReportTrigger
//     sourceDocType="QT"
//     sourceDocId={quote.id}
//     warehouseId={quote.warehouseId}
//   />
// 按鈕 + 點按打開 modal、用戶填 issueType + 5 處置（可選）+ partId + qty + description
// 後端寫 Nx03IssueReport（sourceModule='NX04' 自動帶、軟連結 sourceDocType+sourceDocId）

'use client';

import { useState } from 'react';

import { createIssueReport } from './api';
import type { CreateIssueReportPayload, IssueType, DispositionType, SourceDocType } from '@data/types/shared/issue-report-trigger';
import {
  DISPOSITION_TYPE_LABEL,
  DISPOSITION_TYPES,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPES,
} from '@data/types/shared/issue-report-trigger';

interface Props {
  sourceDocType: SourceDocType;
  sourceDocId: string;
  warehouseId: string;
  /// 可選預填料號（例如 SR detail row 級別觸發、預填本行 partId）
  defaultPartId?: string;
  /// 自訂按鈕樣式
  className?: string;
  label?: string;
}

export function IssueReportTrigger({
  sourceDocType,
  sourceDocId,
  warehouseId,
  defaultPartId,
  className,
  label = '🚨 問題回報',
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? 'rounded border border-rose-300 bg-rose-50 px-3 py-1 text-sm text-rose-900 hover:bg-rose-100'}
      >
        {label}
      </button>
      {open ? (
        <IssueReportModal
          sourceDocType={sourceDocType}
          sourceDocId={sourceDocId}
          warehouseId={warehouseId}
          defaultPartId={defaultPartId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function IssueReportModal({
  sourceDocType,
  sourceDocId,
  warehouseId,
  defaultPartId,
  onClose,
}: {
  sourceDocType: SourceDocType;
  sourceDocId: string;
  warehouseId: string;
  defaultPartId?: string;
  onClose: () => void;
}) {
  const [issueType, setIssueType] = useState<IssueType>('O');
  const [dispositionType, setDispositionType] = useState<DispositionType | ''>('');
  const [partId, setPartId] = useState(defaultPartId ?? '');
  const [qty, setQty] = useState('1');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const needsLocation = issueType === 'L';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partId.trim() || Number(qty) < 0) {
      setErr('partId / qty 必填');
      return;
    }
    if (needsLocation && !locationId.trim()) {
      setErr('issueType=L 放錯庫位時、locationId 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateIssueReportPayload = {
        sourceDocType,
        sourceDocId,
        partId: partId.trim(),
        qty: Number(qty),
        issueType,
        dispositionType: dispositionType || undefined,
        warehouseId,
        locationId: locationId.trim() || undefined,
        description: description.trim() || undefined,
      };
      const resp = await createIssueReport(payload);
      setCreatedId(resp.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '送出失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl space-y-4 rounded-lg bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">🚨 跨單據問題回報</h2>
            <p className="text-xs text-muted-foreground">
              來源：{sourceDocType} · 軟連結 {sourceDocId}
            </p>
          </div>
          <button onClick={onClose} className="rounded border px-3 py-1 text-sm">
            ✕ 關閉
          </button>
        </div>

        {createdId ? (
          <div className="space-y-3">
            <div className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
              ✅ 已建立異常回報單：<span className="font-mono">{createdId}</span>
              <br />
              已寫入庫存異常表（Nx03IssueReport）、倉管 / 主管會收到。
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreatedId(null);
                  setPartId(defaultPartId ?? '');
                  setQty('1');
                  setLocationId('');
                  setDescription('');
                  setIssueType('O');
                  setDispositionType('');
                }}
                className="rounded border px-3 py-1.5 text-sm"
              >
                再回報一筆
              </button>
              <button
                onClick={onClose}
                className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                關閉
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="block mb-1">🟢 異常類型 *</span>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as IssueType)}
                  className="w-full rounded border bg-background px-2 py-1"
                  required
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ISSUE_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block mb-1">🟡 處置方式（可空、預設 N 未處置）</span>
                <select
                  value={dispositionType}
                  onChange={(e) => setDispositionType(e.target.value as DispositionType | '')}
                  className="w-full rounded border bg-background px-2 py-1"
                >
                  <option value="">（不指定處置）</option>
                  {DISPOSITION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {DISPOSITION_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block mb-1">🟢 料號 ID *</span>
                <input
                  value={partId}
                  onChange={(e) => setPartId(e.target.value)}
                  placeholder="NX01PART..."
                  className="w-full rounded border bg-background px-2 py-1 font-mono"
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
              <label className="text-sm md:col-span-2">
                <span className="block mb-1">
                  {needsLocation ? '🟢 庫位 ID *（L 放錯庫位時必填）' : '🟡 庫位 ID（可空）'}
                </span>
                <input
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  placeholder="NX01LOCN..."
                  className="w-full rounded border bg-background px-2 py-1 font-mono"
                  required={needsLocation}
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="block mb-1">⚪ 說明</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="詳細描述、誰反映、發現時間..."
                  className="w-full rounded border bg-background px-2 py-1"
                />
              </label>
            </div>
            {err ? <div className="text-xs text-destructive">{err}</div> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
                取消
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-rose-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? '送出中…' : '送出問題回報'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
