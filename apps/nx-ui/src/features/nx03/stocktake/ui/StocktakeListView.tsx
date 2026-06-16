// apps/nx-ui/src/features/inventory/stocktake/ui/StocktakeListView.tsx
// NX03-STOCK-LITE M3-1：盤點工作台 - 列表 + 快速新增
//
// LITE 範式：空畫面 + 全鍵盤（N=新增 / R=重新整理 / Q=查詢、F=狀態篩選）+ 桌面優先

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createStockTake, listStockTake } from '@data/endpoints/nx03/stocktake/api/stocktake';
import type { CreateStockTakePayload, StockTake, StockTakeStatus } from '@data/types/nx03/stocktake';

const STATUS_OPTIONS: { value: StockTakeStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'COUNTING', label: '盤點中' },
  { value: 'ADJUSTING', label: '調整中' },
  { value: 'POSTED', label: '已過帳' },
  { value: 'CANCELLED', label: '已作廢' },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  COUNTING: '盤點中',
  ADJUSTING: '調整中',
  POSTED: '已過帳',
  CANCELLED: '已作廢',
};
const APPROVAL_LABEL: Record<string, string> = {
  N: '未送審',
  P: '等簽核',
  A: '已核可',
  R: '已退回',
};

export function StocktakeListView() {
  const router = useRouter();
  const [rows, setRows] = useState<StockTake[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StockTakeStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listStockTake({
        status: status || undefined,
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
  }, [status, search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 全鍵盤：N 新增 / R 重新整理 / F 聚焦狀態 / Q 聚焦搜尋
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
        <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · STOCKTAKE</p>
        <h1 className="text-2xl font-semibold tracking-tight">盤點工作台</h1>
        <p className="text-sm text-muted-foreground">
          DRAFT → COUNTING → ADJUSTING → 送審 → 過帳。鍵盤：
          <kbd className="rounded border px-1">N</kbd> 新增 ·
          <kbd className="ml-1 rounded border px-1">R</kbd> 重新整理
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          狀態：
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StockTakeStatus | '')}
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
          搜尋：
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void reload()}
            placeholder="單號 / 備註"
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
          {showNew ? '取消新增' : '新增盤點單 (N)'}
        </button>
      </section>

      {showNew ? <QuickCreateForm onCreated={(id) => router.push(`/dashboard/inventory/stocktake/${id}`)} /> : null}

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {loading && !rows.length ? <div className="text-sm text-muted-foreground">載入中…</div> : null}

      {!loading && !rows.length && !error ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          尚無盤點單。按 <kbd className="rounded border px-1">N</kbd> 新增一張、開始盤點作業。
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">單號</th>
                <th className="px-3 py-2 text-left">日期</th>
                <th className="px-3 py-2 text-left">範圍</th>
                <th className="px-3 py-2 text-left">狀態</th>
                <th className="px-3 py-2 text-left">核可</th>
                <th className="px-3 py-2 text-right">小門檻 (NT$)</th>
                <th className="px-3 py-2 text-left">建立時間</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/50">
                  <td className="px-3 py-2 font-mono">{r.docNo}</td>
                  <td className="px-3 py-2">{r.stockTakeDate.slice(0, 10)}</td>
                  <td className="px-3 py-2">{r.scopeType === 'F' ? '全倉' : '部分'}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {APPROVAL_LABEL[r.approvalStatus] ?? r.approvalStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.smallToleranceQty}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/dashboard/inventory/stocktake/${r.id}`}
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
  const [stockTakeDate, setStockTakeDate] = useState(new Date().toISOString().slice(0, 10));
  const [smallTol, setSmallTol] = useState('0');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId.trim()) {
      setErr('warehouseId 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateStockTakePayload = {
        warehouseId: warehouseId.trim(),
        stockTakeDate,
        smallToleranceQty: Number(smallTol) || 0,
        remark: remark.trim() || undefined,
      };
      const st = await createStockTake(payload);
      onCreated(st.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">新增盤點單</h2>
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
          <span className="block mb-1">🟢 盤點日期 *</span>
          <input
            type="date"
            value={stockTakeDate}
            onChange={(e) => setStockTakeDate(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟡 核可小門檻 (NT$)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={smallTol}
            onChange={(e) => setSmallTol(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          />
          <span className="mt-1 block text-xs text-muted-foreground">≤ 此值倉管自過、超過 G 簽核</span>
        </label>
        <label className="text-sm">
          <span className="block mb-1">⚪ 備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
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
