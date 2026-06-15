// apps/nx-ui/src/features/sale/bundle/ui/BundleDetailView.tsx
// F2 組合套餐 2026-06-09：詳細頁（表頭 + 組成 + 啟停）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ScopePicker } from '@/features/sale/promotion/ui/ScopePicker';

import { getBundle, replaceBundleItems, updateBundle, voidBundle } from '../api/bundle';
import type { Bundle, CreateBundleItemPayload } from '@data/types/sale/bundle';

export function BundleDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    name: string;
    bundlePrice: string;
    validFrom: string;
    validTo: string;
    remark: string;
  } | null>(null);
  const [itemDraft, setItemDraft] = useState<CreateBundleItemPayload[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getBundle(id);
      setDoc(r);
      setItemDraft(r.items?.map((it) => ({ partId: it.partId, qty: it.qty })) ?? []);
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
        {error ?? '找不到套餐'}
      </div>
    );
  }

  const startEdit = () => {
    setEditing({
      name: doc.name,
      bundlePrice: doc.bundlePrice,
      validFrom: doc.validFrom.slice(0, 10),
      validTo: doc.validTo.slice(0, 10),
      remark: doc.remark ?? '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await updateBundle(doc.id, {
        name: editing.name.trim(),
        bundlePrice: editing.bundlePrice,
        validFrom: editing.validFrom,
        validTo: editing.validTo,
        remark: editing.remark.trim() || null,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '存檔失敗');
    } finally {
      setBusy(false);
    }
  };

  const saveItems = async () => {
    setBusy(true);
    setError(null);
    try {
      const filtered = itemDraft.filter((i) => i.partId.trim() && Number(i.qty) > 0);
      if (filtered.length === 0) {
        throw new Error('至少需要 1 組料件');
      }
      await replaceBundleItems(doc.id, filtered);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '組成存檔失敗');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    setError(null);
    try {
      if (doc.isActive) {
        if (!confirm('停用此套餐？SO 開單將無法套用。')) {
          setBusy(false);
          return;
        }
        await voidBundle(doc.id);
      } else {
        await updateBundle(doc.id, { isActive: true });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">組合套餐</p>
          <h1 className="text-xl font-semibold">{doc.code}</h1>
          <p className="text-sm text-muted-foreground">
            {doc.name} · {doc.validFrom.slice(0, 10)} ~ {doc.validTo.slice(0, 10)} · 整組價 {doc.bundlePrice}
          </p>
        </div>
        <Link href="/dashboard/sale/bundle" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveEdit()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              存檔
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(null)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={startEdit}
              className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium"
            >
              編輯表頭
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleActive()}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                doc.isActive
                  ? 'border-destructive/50 text-destructive'
                  : 'border-emerald-500/50 text-emerald-300'
              }`}
            >
              {doc.isActive ? '停用' : '啟用'}
            </button>
          </>
        )}
      </div>

      {/* 表頭 */}
      <section className="rounded-xl border border-border/70 bg-card/40 p-4">
        <h2 className="mb-3 text-sm font-semibold">表頭</h2>
        {editing ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs text-muted-foreground">名稱</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">套餐總價</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editing.bundlePrice}
                onChange={(e) => setEditing((p) => (p ? { ...p, bundlePrice: e.target.value } : p))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">生效起期</span>
              <input
                type="date"
                value={editing.validFrom}
                onChange={(e) => setEditing((p) => (p ? { ...p, validFrom: e.target.value } : p))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">生效迄期</span>
              <input
                type="date"
                value={editing.validTo}
                onChange={(e) => setEditing((p) => (p ? { ...p, validTo: e.target.value } : p))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
            <label className="col-span-2 block">
              <span className="text-xs text-muted-foreground">備註</span>
              <input
                value={editing.remark}
                onChange={(e) => setEditing((p) => (p ? { ...p, remark: e.target.value } : p))}
                maxLength={200}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div><span className="text-xs text-muted-foreground">代碼：</span><span className="font-mono">{doc.code}</span></div>
            <div><span className="text-xs text-muted-foreground">名稱：</span>{doc.name}</div>
            <div><span className="text-xs text-muted-foreground">套餐價：</span><span className="tabular-nums">{doc.bundlePrice}</span></div>
            <div><span className="text-xs text-muted-foreground">時段：</span><span className="tabular-nums text-xs">{doc.validFrom.slice(0, 10)} ~ {doc.validTo.slice(0, 10)}</span></div>
            <div className="col-span-2 sm:col-span-3"><span className="text-xs text-muted-foreground">備註：</span>{doc.remark ?? '—'}</div>
          </div>
        )}
      </section>

      {/* 組成 */}
      <section className="rounded-xl border border-border/70 bg-card/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">組成料件</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setItemDraft((p) => [...p, { partId: '', qty: '1' }])}
              className="rounded border border-border px-2 py-0.5 text-xs"
            >
              + 加料件
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveItems()}
              className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              存組成
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {itemDraft.length === 0 ? (
            <p className="text-xs text-muted-foreground">尚無組成、按「+ 加料件」</p>
          ) : (
            itemDraft.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_60px] gap-2 text-sm">
                <ScopePicker
                  scopeType="P"
                  value={it.partId}
                  onChange={(id) =>
                    setItemDraft((p) => p.map((x, idx) => (idx === i ? { ...x, partId: id } : x)))
                  }
                />
                <input
                  type="number"
                  min={0.0001}
                  step="0.0001"
                  value={it.qty}
                  onChange={(e) =>
                    setItemDraft((p) => p.map((x, idx) => (idx === i ? { ...x, qty: e.target.value } : x)))
                  }
                  className="rounded-md border bg-background px-2 py-1 tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setItemDraft((p) => p.filter((_, idx) => idx !== i))}
                  className="text-xs text-destructive"
                >
                  移除
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        💡 開單套用：在 SO 詳細頁按「套用套餐」→ 選此套餐 → 各料件逐項建 line、bundleId 標記、單價按
        priceA 比例分攤；line.bundleId 非空 → 引擎跳過促銷套用（避免重複折）。
      </div>
    </div>
  );
}
