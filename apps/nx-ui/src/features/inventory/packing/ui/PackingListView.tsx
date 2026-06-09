// apps/nx-ui/src/features/inventory/packing/ui/PackingListView.tsx
// 撿包送 LITE-OP-UI 軌 2 2026-06-09：包貨單操作清單（桌機版）
//
// 業務語意：撿貨單 F=已完成 → 倉管建包貨單、裝包裹（包裹編號 BX-yyyymm-倉-5碼 自動產）。
// state machine：P(待包) → C(包貨中) → F(已完成) → S(已寄出) + V(作廢)。

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  createPl,
  listPls,
  type CreatePlPayload,
  type Pl,
  type PlStatus,
} from '@/features/inventory/workstation/api';

const STATUS_OPTIONS: { value: PlStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'P', label: '待包貨' },
  { value: 'C', label: '包貨中' },
  { value: 'F', label: '已完成' },
  { value: 'S', label: '已寄出' },
  { value: 'V', label: '作廢' },
];

const STATUS_TONE: Record<PlStatus, string> = {
  P: 'bg-amber-500/15 text-amber-300',
  C: 'bg-blue-500/15 text-blue-300',
  F: 'bg-emerald-500/15 text-emerald-300',
  S: 'bg-indigo-500/15 text-indigo-300',
  V: 'bg-muted/30 text-muted-foreground',
};

const STATUS_LABEL: Record<PlStatus, string> = {
  P: '待包貨',
  C: '包貨中',
  F: '已完成',
  S: '已寄出',
  V: '作廢',
};

const PL_TYPE_LABEL: Record<string, string> = { D: '配送', P: '自取', C: '寄貨', T: '調撥' };

export function PackingListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Pl[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PlStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPls({ page: 1, pageSize: 50, status: filterStatus || undefined });
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

  const handleCreate = async (payload: CreatePlPayload) => {
    try {
      const created = await createPl(payload);
      setShowCreate(false);
      router.push(`/dashboard/inventory/packing/${encodeURIComponent(created.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '建單失敗');
    }
  };

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY</p>
          <h1 className="text-xl font-semibold">包貨單</h1>
          <p className="text-xs text-muted-foreground">
            撿完貨 → 建包貨單裝包裹（包裹編號 BX-yyyymm-倉-5 碼自動產）；寄貨類型填物流追蹤號。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          + 新增包貨單
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
            onChange={(e) => setFilterStatus(e.target.value as PlStatus | '')}
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
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">單號</th>
              <th className="px-3 py-2 font-medium">日期</th>
              <th className="px-3 py-2 font-medium">類型</th>
              <th className="px-3 py-2 font-medium">來源撿貨單</th>
              <th className="px-3 py-2 font-medium">物流</th>
              <th className="px-3 py-2 font-medium">追蹤號</th>
              <th className="px-3 py-2 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  尚無包貨單
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/dashboard/inventory/packing/${encodeURIComponent(r.id)}`}
                      className="text-primary hover:underline"
                    >
                      {r.docNo}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.plDate?.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-xs">{PL_TYPE_LABEL[r.plType] ?? r.plType}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.pkNo ?? r.pkId ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.logisticsProvider ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.logisticsTrackingNo ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] ${STATUS_TONE[r.status]}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate ? (
        <CreateDialog onCancel={() => setShowCreate(false)} onSubmit={handleCreate} />
      ) : null}
    </div>
  );
}

function CreateDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (p: CreatePlPayload) => Promise<void>;
}) {
  const [pkId, setPkId] = useState('');
  const [plDate, setPlDate] = useState(new Date().toISOString().slice(0, 10));
  const [plType, setPlType] = useState<'D' | 'P' | 'C' | 'T'>('D');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg">
        <h2 className="text-lg font-semibold">新增包貨單</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          來源撿貨單必須是 F（已完成）；包貨類型須對齊撿貨單配送類型。
        </p>
        <div className="mt-3 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">來源撿貨單 ID *</span>
            <input
              value={pkId}
              onChange={(e) => setPkId(e.target.value)}
              placeholder="NX03PKHD..."
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">包貨日期 *</span>
            <input
              type="date"
              value={plDate}
              onChange={(e) => setPlDate(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">包貨類型 *</span>
            <select
              value={plType}
              onChange={(e) => setPlType(e.target.value as 'D' | 'P' | 'C' | 'T')}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            >
              <option value="D">D 配送</option>
              <option value="P">P 自取</option>
              <option value="C">C 寄貨</option>
              <option value="T">T 調撥</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">備註</span>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
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
            disabled={busy || !pkId.trim() || !plDate}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  pkId: pkId.trim(),
                  plDate,
                  plType,
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
