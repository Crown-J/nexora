// apps/nx-ui/src/features/inventory/disposal/ui/DisposalListView.tsx
// F2 報廢 UI 2026-06-08：報廢單清單頁
//
// 業務語意：手冊 §13.1「報廢模組 Nx03Disposal 完整 UI」補做、後端齊全只缺前端。
// state machine：DRAFT → POSTED 一步（Crown Q-B1=a 不簽核、倉管直接過帳）/ DRAFT → VOIDED 作廢
// 出庫 source=W、不自動進損益（手冊 §7.7 明示邊界、會計手動處理）

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createDisposal, listDisposal } from '@data/endpoints/nx03/disposal/api/disposal';
import {
  type CreateDisposalPayload,
  type Disposal,
  type DisposalStatus,
  DISPOSAL_STATUS_LABEL,
} from '@data/types/nx03/disposal';

const STATUS_OPTIONS: { value: DisposalStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'POSTED', label: '已過帳' },
  { value: 'VOIDED', label: '作廢' },
];

const STATUS_TONE: Record<DisposalStatus, string> = {
  DRAFT: 'bg-muted/30 text-foreground',
  POSTED: 'bg-emerald-500/15 text-emerald-300',
  VOIDED: 'bg-destructive/15 text-destructive',
};

export function DisposalListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Disposal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<DisposalStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDisposal({
        page: 1,
        pageSize: 50,
        status: filterStatus || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (payload: CreateDisposalPayload) => {
    try {
      const created = await createDisposal(payload);
      setShowCreate(false);
      router.push(`/dashboard/inventory/disposal/${encodeURIComponent(created.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '建單失敗');
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY</p>
          <h1 className="text-xl font-semibold">報廢單</h1>
          <p className="text-xs text-muted-foreground">
            異常處置「D 報廢」對應單據；出庫 source=W、不自動進損益（會計手動處理）
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          + 新增報廢單
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">
          狀態
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as DisposalStatus | '')}
            className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">共 {total} 筆</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">單號</th>
              <th className="px-3 py-2 font-medium">日期</th>
              <th className="px-3 py-2 font-medium">狀態</th>
              <th className="px-3 py-2 font-medium">過帳時間</th>
              <th className="px-3 py-2 font-medium">備註</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  尚無報廢單
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-[14px]">
                    <Link
                      href={`/dashboard/inventory/disposal/${encodeURIComponent(r.id)}`}
                      className="text-primary hover:underline"
                    >
                      {r.docNo}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.disposalDate?.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] ${STATUS_TONE[r.status]}`}>
                      {DISPOSAL_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs text-muted-foreground">
                    {r.postedAt ? r.postedAt.slice(0, 16).replace('T', ' ') : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.remark ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate ? <CreateDialog onCancel={() => setShowCreate(false)} onSubmit={handleCreate} /> : null}
    </div>
  );
}

function CreateDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (p: CreateDisposalPayload) => Promise<void>;
}) {
  const [warehouseId, setWarehouseId] = useState('');
  const [disposalDate, setDisposalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg">
        <h2 className="text-lg font-semibold">新增報廢單</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          建立後到詳細頁加報廢明細（料件 / 庫位 / 數量 / 原因）、確認後過帳出庫。
        </p>
        <div className="mt-3 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">倉庫 ID *</span>
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="如 NX01WRHS0000001"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-[14px]"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">報廢日期 *</span>
            <input
              type="date"
              value={disposalDate}
              onChange={(e) => setDisposalDate(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">備註</span>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              maxLength={200}
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            disabled={busy || !warehouseId.trim() || !disposalDate}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  warehouseId: warehouseId.trim(),
                  disposalDate,
                  remark: remark.trim() || undefined,
                });
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '建立中…' : '建立'}
          </button>
        </div>
      </div>
    </div>
  );
}
