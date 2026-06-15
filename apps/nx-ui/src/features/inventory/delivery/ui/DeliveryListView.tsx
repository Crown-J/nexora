// apps/nx-ui/src/features/inventory/delivery/ui/DeliveryListView.tsx
// 撿包送 LITE-OP-UI 軌 3 2026-06-09：配送單操作清單（桌機版）
//
// 業務語意：
// - DELIVERY：從 SO SHIPPED + deliveryType=D 自動建草稿（DnLogisticsService.createDeliveryDnFromShippedSo）
// - RETURN_PICKUP：從 SR POSTED 自動建草稿（createReturnPickupFromPostedSr）
// - 倉管派車（driverUserId/vehicleNo）→ DISPATCHED → 客戶簽收 → DELIVERED/PICKED_UP
// 此版只做 LITE 核心 DELIVERY + RETURN_PICKUP 兩 kind；PICKUP/INTL_SHIPPING 屬另條軌。

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  listDns,
  listReturnPickups,
  type Dn,
  type DnStatus,
  type ReturnPickup,
  type ReturnPickupStatus,
} from '@data/endpoints/inventory/workstation/api';

type DnKindFilter = 'DELIVERY' | 'RETURN_PICKUP';

interface UnifiedRow {
  id: string;
  docNo: string;
  dnDate: string;
  driverUserId: string;
  vehicleNo?: string | null;
  status: string;
  sourceLabel: string;
  remark?: string | null;
  kind: DnKindFilter;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-muted/30 text-foreground',
  DISPATCHED: 'bg-amber-500/15 text-amber-300',
  DELIVERED: 'bg-emerald-500/15 text-emerald-300',
  PICKED_UP: 'bg-emerald-500/15 text-emerald-300',
  FAILED: 'bg-destructive/15 text-destructive',
  VOIDED: 'bg-muted/30 text-muted-foreground',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  DISPATCHED: '已派車',
  DELIVERED: '已送達',
  PICKED_UP: '已取回',
  FAILED: '失敗',
  VOIDED: '作廢',
};

export function DeliveryListView() {
  const [kindFilter, setKindFilter] = useState<DnKindFilter>('DELIVERY');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (kindFilter === 'DELIVERY') {
        const res = await listDns({ page: 1, pageSize: 50, status: statusFilter || undefined });
        setRows(
          res.items.map((d: Dn) => ({
            id: d.id,
            docNo: d.docNo,
            dnDate: d.dnDate,
            driverUserId: d.driverUserId,
            vehicleNo: d.vehicleNo,
            status: d.status,
            sourceLabel: d.sourceSoId ? `SO ${d.sourceSoId}` : '—',
            remark: d.remark,
            kind: 'DELIVERY',
          })),
        );
        setTotal(res.total);
      } else {
        const res = await listReturnPickups({
          page: 1,
          pageSize: 50,
          status: statusFilter || undefined,
        });
        setRows(
          res.items.map((d: ReturnPickup) => ({
            id: d.id,
            docNo: d.docNo,
            dnDate: d.dnDate,
            driverUserId: d.driverUserId,
            vehicleNo: d.vehicleNo,
            status: d.status,
            sourceLabel: d.sourceSrId ? `SR ${d.sourceSrId}` : '—',
            remark: d.remark,
            kind: 'RETURN_PICKUP',
          })),
        );
        setTotal(res.total);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [kindFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusOptions =
    kindFilter === 'DELIVERY'
      ? (['', 'DRAFT', 'DISPATCHED', 'DELIVERED', 'FAILED', 'VOIDED'] as const)
      : (['', 'DRAFT', 'DISPATCHED', 'PICKED_UP', 'FAILED', 'VOIDED'] as const);

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY</p>
          <h1 className="text-xl font-semibold">配送單</h1>
          <p className="text-xs text-muted-foreground">
            DELIVERY 從 SO 出貨自動建草稿、RETURN_PICKUP 從 SR 過帳自動建草稿；倉管派車後客戶簽收 → 推 SO 已完成。
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-md border border-border/70 p-0.5">
          <button
            type="button"
            onClick={() => {
              setKindFilter('DELIVERY');
              setStatusFilter('');
            }}
            className={`rounded px-3 py-1 text-xs ${
              kindFilter === 'DELIVERY' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            配送 (從 SO)
          </button>
          <button
            type="button"
            onClick={() => {
              setKindFilter('RETURN_PICKUP');
              setStatusFilter('');
            }}
            className={`rounded px-3 py-1 text-xs ${
              kindFilter === 'RETURN_PICKUP'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            }`}
          >
            退貨取件 (從 SR)
          </button>
        </div>
        <label className="text-xs text-muted-foreground">
          狀態
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s ? STATUS_LABEL[s] ?? s : '全部'}
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
              <th className="px-3 py-2 font-medium">送貨員</th>
              <th className="px-3 py-2 font-medium">車號</th>
              <th className="px-3 py-2 font-medium">來源</th>
              <th className="px-3 py-2 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  尚無配送單
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const detailPath = `/dashboard/inventory/delivery/${encodeURIComponent(r.id)}?kind=${r.kind}`;
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={detailPath} className="text-primary hover:underline">
                        {r.docNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.dnDate?.slice(0, 10)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.driverUserId}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.vehicleNo ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.sourceLabel}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] ${STATUS_TONE[r.status] ?? 'bg-muted'}`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        💡 此頁不提供「新增配送單」按鈕：DELIVERY 從 SO 出貨自動建、RETURN_PICKUP 從 SR 過帳自動建。
        詳細頁可指派送貨員/車號 + 簽收完成。簽收完成會自動把 SO header 推到「已完成」。
      </div>
    </div>
  );
}
