// apps/nx-ui/src/features/inventory/picking/ui/PickingListView.tsx
// 撿包送 LITE-OP-UI 軌 1 2026-06-09：撿貨單操作清單（桌機版）
//
// 業務語意：手冊 §10.x 撿貨單 = 倉管「待辦工作清單」、從 SO 確認後手動建單。
// state machine：P(待撿) → C(撿貨中) → F(已完成) + V(作廢)。
// 此版補 LITE 核心操作 UI、不含工作站行動條碼掃描（屬另一條工作站軌）。

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  createPk,
  listPks,
  type CreatePkPayload,
  type Pk,
  type PkStatus,
} from '@data/endpoints/inventory/workstation/api';

const STATUS_OPTIONS: { value: PkStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'P', label: '待撿貨' },
  { value: 'C', label: '撿貨中' },
  { value: 'F', label: '已完成' },
  { value: 'V', label: '作廢' },
];

const STATUS_TONE: Record<PkStatus, string> = {
  P: 'bg-amber-500/15 text-amber-300',
  C: 'bg-blue-500/15 text-blue-300',
  F: 'bg-emerald-500/15 text-emerald-300',
  V: 'bg-muted/30 text-muted-foreground',
};

const STATUS_LABEL: Record<PkStatus, string> = {
  P: '待撿貨',
  C: '撿貨中',
  F: '已完成',
  V: '作廢',
};

const TRIGGER_LABEL: Record<'S' | 'T', string> = { S: '銷貨 SO', T: '調撥 ST' };
const DELIVERY_LABEL: Record<string, string> = { D: '配送', P: '自取', C: '寄貨', T: '調撥' };

export function PickingListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Pk[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PkStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPks({ page: 1, pageSize: 50, status: filterStatus || undefined });
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

  const handleCreate = async (payload: CreatePkPayload) => {
    try {
      const created = await createPk(payload);
      setShowCreate(false);
      router.push(`/dashboard/inventory/picking/${encodeURIComponent(created.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '建單失敗');
    }
  };

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY</p>
          <h1 className="text-xl font-semibold">撿貨單</h1>
          <p className="text-xs text-muted-foreground">
            倉管的撿貨待辦清單；從 SO 確認後手動建單、逐項標已完成 / 找不到貨、全部撿完推進已完成。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          + 新增撿貨單
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
            onChange={(e) => setFilterStatus(e.target.value as PkStatus | '')}
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
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">單號</th>
              <th className="px-3 py-2 font-medium">日期</th>
              <th className="px-3 py-2 font-medium">來源</th>
              <th className="px-3 py-2 font-medium">配送類型</th>
              <th className="px-3 py-2 font-medium">撿貨碼</th>
              <th className="px-3 py-2 font-medium">狀態</th>
              <th className="px-3 py-2 font-medium">完成時間</th>
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
                  尚無撿貨單
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/dashboard/inventory/picking/${encodeURIComponent(r.id)}`}
                      className="text-primary hover:underline"
                    >
                      {r.docNo}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.pkDate?.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-xs">{TRIGGER_LABEL[r.triggerSource]}</td>
                  <td className="px-3 py-2 text-xs">
                    {DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.pickupCode ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] ${STATUS_TONE[r.status]}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs text-muted-foreground">
                    {r.completedAt ? r.completedAt.slice(0, 16).replace('T', ' ') : '—'}
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
  onSubmit: (p: CreatePkPayload) => Promise<void>;
}) {
  const [warehouseId, setWarehouseId] = useState('');
  const [pkDate, setPkDate] = useState(new Date().toISOString().slice(0, 10));
  const [triggerSource, setTriggerSource] = useState<'S' | 'T'>('S');
  const [deliveryType, setDeliveryType] = useState<'D' | 'P' | 'C' | 'T'>('D');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg">
        <h2 className="text-lg font-semibold">新增撿貨單</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          建立後到詳細頁加要撿的料件（SO line 或 ST line）。
        </p>
        <div className="mt-3 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">倉庫 ID *</span>
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="NX01WRHS..."
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">撿貨日期 *</span>
            <input
              type="date"
              value={pkDate}
              onChange={(e) => setPkDate(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">來源 *</span>
              <select
                value={triggerSource}
                onChange={(e) => setTriggerSource(e.target.value as 'S' | 'T')}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              >
                <option value="S">S 銷貨</option>
                <option value="T">T 調撥</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">配送類型 *</span>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as 'D' | 'P' | 'C' | 'T')}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              >
                <option value="D">D 配送</option>
                <option value="P">P 自取</option>
                <option value="C">C 寄貨</option>
                <option value="T">T 調撥</option>
              </select>
            </label>
          </div>
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
            disabled={busy || !warehouseId.trim() || !pkDate}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  warehouseId: warehouseId.trim(),
                  pkDate,
                  triggerSource,
                  deliveryType,
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
