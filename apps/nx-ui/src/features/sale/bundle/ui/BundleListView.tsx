// apps/nx-ui/src/features/sale/bundle/ui/BundleListView.tsx
// F2 組合套餐 2026-06-09：列表 + 建單 dialog（範式同 PromotionListView）

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ScopePicker } from '@/features/sale/promotion/ui/ScopePicker';

import { createBundle, listBundle } from '@data/endpoints/sale/bundle/api/bundle';
import type { Bundle, CreateBundleItemPayload, CreateBundlePayload } from '@data/types/sale/bundle';

function todayYmd(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function BundleListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Bundle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listBundle({
        page: 1,
        pageSize: 50,
        isActive: filterActive === '' ? undefined : filterActive === 'true',
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterActive]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (payload: CreateBundlePayload) => {
    try {
      const created = await createBundle(payload);
      setShowCreate(false);
      router.push(`/dashboard/sale/bundle/${encodeURIComponent(created.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '建單失敗');
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE</p>
          <h1 className="text-xl font-semibold">組合套餐</h1>
          <p className="text-xs text-muted-foreground">
            套餐 = 多料件 + 整組總價；開單套用 → 各料件逐項出庫扣庫存、整組單價 = 套餐價（按 priceA 比例分攤）。
            <br />
            ⚠️ 套餐 line 不再跑促銷引擎（套餐價即最終價、避免重複折）。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            + 新增套餐
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
          狀態
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as '' | 'true' | 'false')}
            className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">全部</option>
            <option value="true">啟用</option>
            <option value="false">停用</option>
          </select>
        </label>
        <span className="text-xs text-muted-foreground">共 {total} 筆</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">代碼</th>
              <th className="px-3 py-2 font-medium">名稱</th>
              <th className="px-3 py-2 text-right font-medium">套餐價</th>
              <th className="px-3 py-2 font-medium">時段</th>
              <th className="px-3 py-2 text-right font-medium">組成</th>
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
                  尚無套餐
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/dashboard/sale/bundle/${encodeURIComponent(r.id)}`}
                      className="text-primary hover:underline"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.bundlePrice}</td>
                  <td className="px-3 py-2 tabular-nums text-xs">
                    {r.validFrom.slice(0, 10)} ~ {r.validTo.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">{r.items?.length ?? 0} 項</td>
                  <td className="px-3 py-2">
                    {r.isActive ? (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">啟用</span>
                    ) : (
                      <span className="rounded bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">停用</span>
                    )}
                  </td>
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
  onSubmit: (p: CreateBundlePayload) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [validFrom, setValidFrom] = useState(todayYmd());
  const [validTo, setValidTo] = useState(todayYmd(60));
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<CreateBundleItemPayload[]>([{ partId: '', qty: '1' }]);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    code.trim().length > 0 &&
    name.trim().length > 0 &&
    bundlePrice.trim().length > 0 &&
    Number(bundlePrice) > 0 &&
    validFrom &&
    validTo &&
    items.every((i) => i.partId.trim().length > 0 && Number(i.qty) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border bg-card p-4 shadow-lg">
        <h2 className="text-lg font-semibold">新增組合套餐</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          整組總價 = 套餐價（系統按 priceA × qty 比例分攤到各料件 line）
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">代碼 *</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="例：MAINT-BASIC"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs uppercase"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">名稱 *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：基礎保養套組"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">套餐總價 *（整組）</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={bundlePrice}
              onChange={(e) => setBundlePrice(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">生效起期 *</span>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">生效迄期 *</span>
            <input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <label className="col-span-2 block">
            <span className="text-xs text-muted-foreground">備註</span>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">組成料件 *（至少一筆）</p>
            <button
              type="button"
              onClick={() => setItems((p) => [...p, { partId: '', qty: '1' }])}
              className="rounded border border-border px-2 py-0.5 text-xs hover:border-primary/50"
            >
              + 加料件
            </button>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_60px] gap-2 text-sm">
              {/* 沿用 F1-E ScopePicker、scopeType='P' 即料件 lookup */}
              <ScopePicker
                scopeType="P"
                value={it.partId}
                onChange={(id) =>
                  setItems((p) => p.map((x, idx) => (idx === i ? { ...x, partId: id } : x)))
                }
              />
              <input
                type="number"
                min={0.0001}
                step="0.0001"
                value={it.qty}
                onChange={(e) =>
                  setItems((p) => p.map((x, idx) => (idx === i ? { ...x, qty: e.target.value } : x)))
                }
                className="rounded-md border bg-background px-2 py-1 tabular-nums"
              />
              <button
                type="button"
                disabled={items.length <= 1}
                onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                className="text-xs text-destructive disabled:opacity-30"
              >
                移除
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            disabled={busy || !canSubmit}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  code: code.trim().toUpperCase(),
                  name: name.trim(),
                  bundlePrice,
                  validFrom,
                  validTo,
                  remark: remark.trim() || undefined,
                  items,
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
