// apps/nx-ui/src/features/purchase/demand/DemandListView.tsx
// v1.2 階段 I P3：採購需求清單 + 手動新增 + 忽略
//
// 範式對齊：
// - 接 GET /nx02/demand（含 demandType=S AR 自動 + O 客訂 + 手動三來源聚合顯示）
// - 「+ 手動新增」dialog（demandType 預設 O、partId/warehouseId/qty 必填）
// - 「忽略」action（status='O'/'P' → 'I'、含 ignoreReason）
// - 篩選：demandType + status + search docNo/remark

'use client';

import { useCallback, useEffect, useState } from 'react';
import { PackageSearch, Plus, RefreshCw, XCircle } from 'lucide-react';

import { openPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';
import { cn } from '@design/utils/cn';

import {
  createDemand,
  ignoreDemand,
  listDemand,
  type Demand,
  type DemandStatus,
  type DemandType,
} from '@data/endpoints/nx02/demand/api';

const TYPE_LABEL: Record<DemandType, string> = {
  S: '補貨自動',
  O: '客訂',
};

const STATUS_LABEL: Record<DemandStatus, string> = {
  O: '待處理',
  P: '處理中',
  C: '已完成',
  I: '已忽略',
};

const STATUS_TONE: Record<DemandStatus, string> = {
  O: 'bg-[#E8A020]/15 text-[#E8A020]',
  P: 'bg-[#4D8FE8]/15 text-[#4D8FE8]',
  C: 'bg-[#1D9E75]/15 text-[#1D9E75]',
  I: 'bg-muted text-muted-foreground',
};

const TYPE_TONE: Record<DemandType, string> = {
  S: 'bg-[#4D8FE8]/15 text-[#4D8FE8]',
  O: 'bg-[#E8A020]/15 text-[#E8A020]',
};

export function DemandListView() {
  const [rows, setRows] = useState<Demand[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<DemandType | ''>('');
  const [filterStatus, setFilterStatus] = useState<DemandStatus | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  // create form state
  const [partId, setPartId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [qty, setQty] = useState('10');
  const [customerId, setCustomerId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [remark, setRemark] = useState('');
  const [createDemandType, setCreateDemandType] = useState<DemandType>('O');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDemand({
        page,
        pageSize: 20,
        demandType: filterType || undefined,
        status: filterStatus || undefined,
        search: search.trim() || undefined,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterStatus, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!partId.trim() || !warehouseId.trim()) {
      setError('料號 ID 與倉庫 ID 必填');
      return;
    }
    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError('數量必須 > 0');
      return;
    }
    if (createDemandType === 'O' && !customerId.trim()) {
      setError('客訂類型必須填客戶 ID');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createDemand({
        demandType: createDemandType,
        partId: partId.trim(),
        warehouseId: warehouseId.trim(),
        qty: qtyNum,
        customerId: customerId.trim() || undefined,
        expectedDate: expectedDate || undefined,
        remark: remark.trim() || undefined,
      });
      setShowCreate(false);
      setPartId('');
      setWarehouseId('');
      setQty('10');
      setCustomerId('');
      setExpectedDate('');
      setRemark('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleIgnore = async (id: string) => {
    const reason = window.prompt('忽略原因（必填）：');
    if (!reason?.trim()) return;
    try {
      await ignoreDemand(id, reason.trim());
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">PURCHASE</p>
          <h1 className="text-xl font-semibold">採購需求</h1>
          <p className="text-sm text-muted-foreground">
            3 來源聚合：補貨自動（盤點低量）/ 客訂（銷貨缺貨）/ 手動新增
          </p>
        </div>
        <div className="flex gap-2">
          {/* F2 改版 Step 5（交接 §1）：採購入口＝嵌採購需求單旁；2026-07-11 夜 F1/F2 分流改標 F1 */}
          <button
            type="button"
            onClick={() => openPartQuickSearch({ entry: 'purchase' })}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:border-primary/50"
            title="即時庫存查詢（F1）"
          >
            <PackageSearch className="size-4" />
            庫存查詢
            <kbd className="rounded border border-border/50 bg-muted/40 px-1 py-px font-mono text-[10px]">F1</kbd>
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:border-primary/50 disabled:opacity-50"
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            重新整理
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            手動新增
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-3">
        <label className="text-xs text-muted-foreground">
          類型
          <select
            value={filterType}
            onChange={(e) => {
              setPage(1);
              setFilterType(e.target.value as DemandType | '');
            }}
            className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">全部</option>
            <option value="S">補貨自動</option>
            <option value="O">客訂</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          狀態
          <select
            value={filterStatus}
            onChange={(e) => {
              setPage(1);
              setFilterStatus(e.target.value as DemandStatus | '');
            }}
            className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">全部</option>
            <option value="O">待處理</option>
            <option value="P">處理中</option>
            <option value="C">已完成</option>
            <option value="I">已忽略</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          搜尋
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="單號 / 備註"
            className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">單號</th>
              <th className="px-3 py-2">來源</th>
              <th className="px-3 py-2">料號 / 品名</th>
              <th className="px-3 py-2">倉庫</th>
              <th className="px-3 py-2 text-right">數量</th>
              <th className="px-3 py-2">客戶</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2 text-right">動作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-border/50 hover:bg-muted/10">
                <td className="px-3 py-2 font-mono text-xs">{d.docNo}</td>
                <td className="px-3 py-2">
                  <span className={cn('rounded px-2 py-0.5 text-[10px]', TYPE_TONE[d.demandType])}>
                    {TYPE_LABEL[d.demandType]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="font-mono text-xs text-muted-foreground">{d.part?.code ?? d.partId}</div>
                  <div className="text-sm">{d.part?.name ?? '—'}</div>
                </td>
                <td className="px-3 py-2 text-xs">{d.warehouse?.code ?? d.warehouseId}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.qty}</td>
                <td className="px-3 py-2 text-sm">{d.customer?.name ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className={cn('rounded px-2 py-0.5 text-[10px]', STATUS_TONE[d.status])}>
                    {STATUS_LABEL[d.status]}
                  </span>
                  {d.status === 'I' && d.ignoreReason ? (
                    <div className="mt-1 text-[10px] text-muted-foreground">{d.ignoreReason}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right">
                  {(d.status === 'O' || d.status === 'P') ? (
                    <button
                      type="button"
                      onClick={() => void handleIgnore(d.id)}
                      className="inline-flex items-center gap-1 rounded border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="size-3.5" />
                      忽略
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  尚無採購需求
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            上一頁
          </button>
          <span className="tabular-nums text-muted-foreground">
            {page} / {pages}
          </span>
          <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            下一頁
          </button>
        </div>
      ) : null}

      {/* 手動新增 dialog */}
      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
            <h2 className="mb-3 text-base font-semibold">手動新增採購需求</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">類型</label>
                <div className="flex gap-2">
                  {(['O', 'S'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCreateDemandType(t)}
                      className={cn(
                        'flex-1 rounded-md border px-3 py-2 text-sm',
                        createDemandType === t
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">料號 ID *</label>
                <input
                  type="text"
                  value={partId}
                  onChange={(e) => setPartId(e.target.value)}
                  placeholder="NX01PART..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">倉庫 ID *</label>
                <input
                  type="text"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  placeholder="NX01WHSE..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">數量 *</label>
                <input
                  type="number"
                  min={0.0001}
                  step="0.0001"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              {createDemandType === 'O' ? (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">客戶 ID *（客訂類型必填）</label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="NX01PRTN..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">期望到貨日</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">備註</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/20 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? '建立中…' : '建立'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
