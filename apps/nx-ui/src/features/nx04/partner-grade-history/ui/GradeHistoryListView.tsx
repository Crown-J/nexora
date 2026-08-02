// apps/nx-ui/src/features/sale/partner-grade-history/ui/GradeHistoryListView.tsx
// NX04-M3 C5：客戶等級變更歷史 - 通用 list（可篩 partnerId / status）+ 申請 + 核可 / 退回

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  approveGradeChange,
  listGradeHistory,
  rejectGradeChange,
  requestGradeChange,
} from '@data/endpoints/nx04/partner-grade-history/api/partner-grade-history';
import type {
  CreateGradeChangeRequestPayload,
  PartnerGradeHistoryRow,
  PghStatus,
} from '@data/types/nx04/partner-grade-history';
import { PGH_STATUS_BADGE_CLASS, PGH_STATUS_LABEL, PGH_STATUSES } from '@data/types/nx04/partner-grade-history';

interface Props {
  /// 若傳入 partnerId、清單預設過濾該客戶；否則全部變更歷史
  partnerId?: string;
  /// 預設過濾的狀態（給「全域待核可清單頁」傳入 'PENDING'）
  defaultStatus?: PghStatus | '';
  /// 標題覆寫
  title?: string;
  subtitle?: string;
  /// 是否顯示「我要申請變更」表單區塊
  showRequestForm?: boolean;
  /// 是否顯示「核可 / 退回」按鈕（限 OWNER 場景）
  showActions?: boolean;
}

const STATUS_OPTIONS: { value: PghStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  ...PGH_STATUSES.map((s) => ({ value: s, label: `${s} ${PGH_STATUS_LABEL[s]}` })),
];

export function GradeHistoryListView({
  partnerId,
  defaultStatus = '',
  title = '客戶等級變更歷史',
  subtitle = '業務員申請 → G 主管核可 / 退回 → 核可後自動更新客戶等級、新 QT 套用新毛利率。',
  showRequestForm = true,
  showActions = true,
}: Props) {
  const [rows, setRows] = useState<PartnerGradeHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PghStatus | ''>(defaultStatus);
  const [partnerFilter, setPartnerFilter] = useState(partnerId ?? '');
  const [showNew, setShowNew] = useState(false);

  const effectivePartnerId = partnerId ?? (partnerFilter.trim() || undefined);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listGradeHistory({
        partnerId: effectivePartnerId,
        status: status || undefined,
      });
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'list 失敗');
    } finally {
      setLoading(false);
    }
  }, [effectivePartnerId, status]);

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
        if (showRequestForm) setShowNew((v) => !v);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void reload();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reload, showRequestForm]);

  async function handleApprove(id: string) {
    if (!window.confirm('確認核可此變更？核可後立即更新客戶等級、影響後續 QT 毛利率。')) return;
    try {
      await approveGradeChange(id);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '核可失敗');
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt('退回原因（必填）');
    if (!reason?.trim()) return;
    try {
      await rejectGradeChange(id, { rejectReason: reason.trim() });
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '退回失敗');
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE · CUSTOMER GRADE CHANGE</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {subtitle}
          {showRequestForm ? (
            <>
              <kbd className="ml-2 rounded border px-1">N</kbd> 申請
            </>
          ) : null}
          <kbd className="ml-1 rounded border px-1">R</kbd> 重新整理
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        {!partnerId ? (
          <label className="flex items-center gap-2 text-sm">
            客戶 ID 篩選：
            <input
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void reload()}
              placeholder="NX01PTNR... 留空查全部"
              className="rounded border bg-background px-2 py-1 font-mono"
            />
          </label>
        ) : (
          <span className="rounded bg-muted px-2 py-1 text-xs">客戶 {partnerId}</span>
        )}
        <label className="flex items-center gap-2 text-sm">
          狀態：
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PghStatus | '')}
            className="rounded border bg-background px-2 py-1"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => void reload()} className="rounded border px-3 py-1 text-sm hover:bg-muted">
          重新整理
        </button>
        {showRequestForm ? (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
          >
            {showNew ? '取消申請' : '我要申請變更 (N)'}
          </button>
        ) : null}
      </section>

      {showNew && showRequestForm ? (
        <RequestForm
          defaultPartnerId={partnerId ?? partnerFilter}
          onCreated={() => {
            setShowNew(false);
            void reload();
          }}
          onCancel={() => setShowNew(false)}
        />
      ) : null}

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {loading && !rows.length ? <div className="text-sm text-muted-foreground">載入中…</div> : null}

      {!loading && !rows.length && !error ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          無符合條件的變更歷史。
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">客戶</th>
                <th className="px-3 py-2 text-left">舊等級 → 新等級</th>
                <th className="px-3 py-2 text-left">申請原因</th>
                <th className="px-3 py-2 text-left">申請人 / 時間</th>
                <th className="px-3 py-2 text-left">核可 / 退回</th>
                <th className="px-3 py-2 text-left">狀態</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-[14px]">{r.partnerId}</td>
                  <td className="px-3 py-2 font-mono text-[14px]">
                    {r.oldGradeId} → <strong>{r.newGradeId}</strong>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.reason}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{r.requestedBy}</div>
                    <div className="text-muted-foreground">{r.requestedAt.slice(0, 19).replace('T', ' ')}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.status === 'APPROVED' && r.approvedAt ? (
                      <>
                        <div>{r.approvedBy}</div>
                        <div className="text-emerald-700">{r.approvedAt.slice(0, 19).replace('T', ' ')}</div>
                      </>
                    ) : r.status === 'REJECTED' && r.rejectReason ? (
                      <div className="text-rose-700">{r.rejectReason}</div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${PGH_STATUS_BADGE_CLASS[r.status] ?? 'bg-muted'}`}>
                      {PGH_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {showActions && r.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => void handleApprove(r.id)}
                          className="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white"
                        >
                          核可
                        </button>
                        <button
                          onClick={() => void handleReject(r.id)}
                          className="rounded border border-rose-300 px-2 py-0.5 text-xs text-rose-700"
                        >
                          退回
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <footer className="text-xs text-muted-foreground">共 {rows.length} 筆</footer>
    </div>
  );
}

function RequestForm({
  defaultPartnerId,
  onCreated,
  onCancel,
}: {
  defaultPartnerId?: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [partnerId, setPartnerId] = useState(defaultPartnerId ?? '');
  const [newGradeId, setNewGradeId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerId.trim() || !newGradeId.trim() || !reason.trim()) {
      setErr('partnerId / newGradeId / reason 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateGradeChangeRequestPayload = {
        partnerId: partnerId.trim(),
        newGradeId: newGradeId.trim(),
        reason: reason.trim(),
      };
      await requestGradeChange(payload);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '申請失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">申請客戶等級變更（送 G 主管核可）</h2>
      <p className="text-xs text-muted-foreground">
        ⚠️ 客戶需先設過 customerGradeId 才能申請；不允許同客戶重複 PENDING。
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="block mb-1">🟢 客戶 ID *</span>
          <input
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            placeholder="NX01PTNR..."
            className="w-full rounded border bg-background px-2 py-1 font-mono"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 新等級 ID *</span>
          <input
            value={newGradeId}
            onChange={(e) => setNewGradeId(e.target.value)}
            placeholder="NX01CUGR..."
            className="w-full rounded border bg-background px-2 py-1 font-mono"
            required
          />
        </label>
        <label className="text-sm md:col-span-3">
          <span className="block mb-1">🟢 申請原因 *</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="客戶業績成長 / 多次大量採購 / 同行轉介..."
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
      </div>
      {err ? <div className="text-xs text-destructive">{err}</div> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? '送出中…' : '送出申請'}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-1.5 text-sm">
          取消
        </button>
      </div>
    </form>
  );
}
