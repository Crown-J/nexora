// apps/nx-ui/src/features/inventory/disposal/ui/DisposalDetailView.tsx
// F2 報廢 UI 2026-06-08：報廢單詳細頁 + 明細 CRUD + 狀態流轉
//
// state machine：DRAFT → POSTED（過帳、不簽核、source=W）/ DRAFT → VOIDED（作廢）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  addDisposalItem,
  getDisposal,
  removeDisposalItem,
  updateDisposal,
  voidDisposal,
} from '../api/disposal';
import {
  type CreateDisposalItemPayload,
  type Disposal,
  type DisposalReason,
  DISPOSAL_REASONS,
  DISPOSAL_REASON_LABEL,
  DISPOSAL_STATUS_LABEL,
} from '../types';

export function DisposalDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<Disposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoc(await getDisposal(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        {error ?? '找不到單據'}
      </div>
    );
  }

  const isDraft = doc.status === 'DRAFT';
  const isPosted = doc.status === 'POSTED';

  const run = async (fn: () => Promise<unknown>, errMsg: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : errMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">報廢單</p>
          <h1 className="text-xl font-semibold">{doc.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            {DISPOSAL_STATUS_LABEL[doc.status]} · {doc.disposalDate?.slice(0, 10)}
            {doc.postedAt ? ` · 過帳 ${doc.postedAt.slice(0, 16).replace('T', ' ')}` : ''}
          </p>
        </div>
        <Link href="/dashboard/inventory/disposal" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      {/* 動作列 */}
      <div className="flex flex-wrap gap-2">
        {isDraft ? (
          <>
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={busy || !doc.items?.length}
              onClick={() => {
                if (!confirm('過帳此報廢單？\n（出庫 source=W、不可逆、不自動進損益）')) return;
                void run(() => updateDisposal(doc.id, { status: 'POSTED' }), '過帳失敗');
              }}
              title={!doc.items?.length ? '需先加報廢明細才能過帳' : '過帳出庫'}
            >
              過帳（DRAFT → POSTED）
            </button>
            <button
              type="button"
              className="rounded-md border border-destructive/50 px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                if (!confirm('作廢草稿？')) return;
                void run(() => voidDisposal(doc.id), '作廢失敗');
              }}
            >
              作廢
            </button>
            <button
              type="button"
              className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              disabled={busy}
              onClick={() => setShowAddItem(true)}
            >
              + 加報廢明細
            </button>
          </>
        ) : null}
        {isPosted ? (
          <p className="self-center text-xs text-muted-foreground">已過帳、不可修改</p>
        ) : null}
        {doc.status === 'VOIDED' ? (
          <p className="self-center text-xs text-destructive">已作廢</p>
        ) : null}
      </div>

      {/* 明細 */}
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">料號</th>
              <th className="px-3 py-2 font-medium">庫位</th>
              <th className="px-3 py-2 text-right font-medium">數量</th>
              <th className="px-3 py-2 text-right font-medium">單位成本</th>
              <th className="px-3 py-2 font-medium">原因</th>
              <th className="px-3 py-2 font-medium">說明</th>
              {isDraft ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {(doc.items?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={isDraft ? 8 : 7} className="px-3 py-8 text-center text-muted-foreground">
                  尚無報廢明細、請按「加報廢明細」
                </td>
              </tr>
            ) : (
              doc.items?.map((it) => (
                <tr key={it.id} className="border-b border-border/50">
                  <td className="px-3 py-2">{it.lineNo}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <div>{it.partNo}</div>
                    <div className="text-[10px] text-muted-foreground">{it.partName}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{it.locationId}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.unitCost}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
                      {it.disposalReason} {DISPOSAL_REASON_LABEL[it.disposalReason] ?? ''}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {it.disposalRemark ?? '—'}
                  </td>
                  {isDraft ? (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-destructive underline disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          if (!confirm(`移除 ${it.partNo}？`)) return;
                          void run(() => removeDisposalItem(doc.id, it.id), '移除失敗');
                        }}
                      >
                        移除
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 業務說明 */}
      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        💡 過帳：每筆明細走 applyQtyOutWithLedger（source=W、helper 內部用 stock_balance.avgCost）；
        庫存↓、不自動進損益（會計手動處理）。對應異常處置「D 報廢」、可從異常單回填 relatedDocId。
      </div>

      {showAddItem ? (
        <AddItemDialog
          onCancel={() => setShowAddItem(false)}
          onSubmit={async (p) => {
            await run(() => addDisposalItem(doc.id, p), '加明細失敗');
            setShowAddItem(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AddItemDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (p: CreateDisposalItemPayload) => Promise<void>;
}) {
  const [partId, setPartId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState<DisposalReason>('A');
  const [disposalRemark, setDisposalRemark] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg">
        <h2 className="text-lg font-semibold">加報廢明細</h2>
        <div className="mt-3 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">料件 ID *</span>
            <input
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
              placeholder="如 NX01PART0000001"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">庫位 ID *</span>
            <input
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              placeholder="如 NX01LOCN0000001"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">數量 *</span>
            <input
              type="number"
              min={0.0001}
              step="0.0001"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">報廢原因 *</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as DisposalReason)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            >
              {DISPOSAL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r} {DISPOSAL_REASON_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">
              說明 {reason === 'D' ? '*（D 其他必填）' : ''}
            </span>
            <input
              value={disposalRemark}
              onChange={(e) => setDisposalRemark(e.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            disabled={
              busy ||
              !partId.trim() ||
              !locationId.trim() ||
              !qty ||
              Number(qty) <= 0 ||
              (reason === 'D' && !disposalRemark.trim())
            }
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  partId: partId.trim(),
                  locationId: locationId.trim(),
                  qty: Number(qty),
                  disposalReason: reason,
                  disposalRemark: disposalRemark.trim() || undefined,
                });
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '加入中…' : '加入'}
          </button>
        </div>
      </div>
    </div>
  );
}
